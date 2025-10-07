import type { Framebuffer2D, Regl, Texture2D } from "regl";
import type { Size } from "../types";

export class FBO {
  size: Size;
  texture: Texture2D;
  buffer: Framebuffer2D;

  constructor(regl: Regl, size: Size) {
    this.size = size;
    this.texture = regl.texture({
      width: size.width,
      height: size.height,
      min: "linear",
      mag: "linear",
    });
    this.buffer = regl.framebuffer({ color: this.texture });
  }

  resize(size: Size) {
    if (this.size.width === size.width && this.size.height === size.height) {
      return;
    }
    this.size = size;
    this.texture.resize(size.width, size.height);
    this.buffer.resize(size.width, size.height);
  }

  destroy() {
    this.texture.destroy();
    this.buffer.destroy();
  }
}
