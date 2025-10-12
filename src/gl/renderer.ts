import { Size } from "../utils/size";
import { GLBuffer, GLBufferParams } from "./buffer";
import { FramebufferConfig, GLFramebuffer } from "./fbo";
import { GLProgram, GLProgramDefinition } from "./program";
import { GLTexture, GLTextureParams } from "./texture";

export type GLContext = WebGLRenderingContext;

export type GLRendererParams = {
  context?: GLContext;
  canvas?: HTMLCanvasElement;
  attributes?: WebGLContextAttributes;
};

export class GLRenderer {
  gl: GLContext;
  programs: WeakMap<GLProgramDefinition, GLProgram>;

  constructor(params: GLRendererParams = {}) {
    const canvas = params.canvas ?? document.createElement("canvas");
    const context =
      params.context ??
      canvas.getContext("webgl", {
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        depth: false,
        ...params.attributes,
      });

    if (!context) {
      throw new Error("Failed to create WebGL context");
    }

    this.gl = context;
    this.programs = new WeakMap();
  }

  get canvas() {
    return this.gl.canvas as HTMLCanvasElement;
  }

  resize(size: Size) {
    if (this.canvas.width !== size.width) {
      this.canvas.width = size.width;
    }
    if (this.canvas.height !== size.height) {
      this.canvas.height = size.height;
    }
    this.gl.viewport(0, 0, size.width, size.height);
  }

  clear(color = [0, 0, 0, 1]) {
    const [r, g, b, a] = color;
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  program<Props extends {} = {}>(definition: GLProgramDefinition<Props>) {
    const cached = this.programs.get(definition as GLProgramDefinition);
    if (cached) {
      return cached;
    }
    const program = new GLProgram(this.gl, definition);
    this.programs.set(definition as GLProgramDefinition, program as GLProgram);
    return program as GLProgram<Props>;
  }

  texture(params: GLTextureParams) {
    return new GLTexture(this.gl, params);
  }

  framebuffer(params: FramebufferConfig) {
    return new GLFramebuffer(this.gl, params);
  }

  buffer(params: GLBufferParams) {
    return new GLBuffer(this.gl, params);
  }

  dispose() {}
}
