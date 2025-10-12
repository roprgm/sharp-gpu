import { GLTexture } from "./texture";
import type { GLContext } from "./renderer";
import type { Size } from "../utils/size";

export type FramebufferConfig = {
  width: number;
  height: number;
  texture?: GLTexture;
};

export class GLFramebuffer {
  readonly handle: WebGLFramebuffer;
  readonly texture: GLTexture;

  private readonly gl: GLContext;
  private ownsTexture: boolean;

  constructor(gl: GLContext, config: FramebufferConfig) {
    const handle = gl.createFramebuffer();
    if (!handle) {
      throw new Error("Failed to create framebuffer");
    }

    this.gl = gl;
    this.handle = handle;
    this.ownsTexture = !config.texture;
    this.texture =
      config.texture ??
      new GLTexture(gl, {
        width: config.width,
        height: config.height,
        data: null,
      });

    this.use(() => {
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.texture.handle,
        0,
      );
    });
  }

  get size(): Size {
    return { width: this.texture.width, height: this.texture.height };
  }

  use(fn: () => void) {
    const previous = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING) as
      | WebGLFramebuffer
      | null;
    const viewportState = this.gl.getParameter(this.gl.VIEWPORT) as Int32Array;
    const previousViewport = [
      viewportState[0],
      viewportState[1],
      viewportState[2],
      viewportState[3],
    ];

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.handle);
    this.gl.viewport(0, 0, this.size.width, this.size.height);
    try {
      fn();
    } finally {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, previous);
      this.gl.viewport(
        previousViewport[0],
        previousViewport[1],
        previousViewport[2],
        previousViewport[3],
      );
    }
  }

  resize(size: Size) {
    this.texture.resize(size.width, size.height);
  }

  dispose() {
    if (this.ownsTexture) {
      this.texture.dispose();
    }
    this.gl.deleteFramebuffer(this.handle);
  }
}
