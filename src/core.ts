import { GLRenderer, GLTexture } from "./gl";
import { clampVec3Min, toVec3, toVec4, Vec3, Vec4 } from "./utils/vector";

import { COPY } from "./programs";
import { BaseOperation, CopyOperation } from "./operations/base";

import { ColorOperation } from "./operations/color";
import { Size, ResizeParams, ResizeOperation } from "./operations/resize";
import { BlurOperation } from "./operations/blur";
import { ModulateOperation, ModulateParams } from "./operations/modulate";
import { GammaOperation } from "./operations/gamma";
import { LinearOperation } from "./operations/linear";
import { LUTOperation, LUTParams } from "./operations/lut";

type ImageSource = string;
type LinearInput = number | Vec3 | Vec4;

type SharpGPUParams = {
  renderer?: GLRenderer;
  operations?: BaseOperation[];
};

export class SharpGPU {
  renderer: GLRenderer;
  operations: BaseOperation[] = [];

  constructor(params: SharpGPUParams = {}) {
    this.renderer = params.renderer ?? new GLRenderer();
    this.operations = params.operations ?? [];
  }

  static async from(src: ImageSource) {
    return new SharpGPU().loadImage(src);
  }

  get canvas() {
    return this.renderer.canvas;
  }

  get size(): Size {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  clone() {
    return new SharpGPU({
      renderer: this.renderer,
      operations: [...this.operations],
    });
  }

  async loadImage(src: ImageSource) {
    const image = new Image();
    image.src = src;
    await image.decode();

    const texture = this.renderer.texture({
      width: image.width,
      height: image.height,
      data: image,
      flipY: true,
    });

    return this.resize(image).copy(texture);
  }

  // Operations
  addOperation(operation: BaseOperation) {
    this.operations.push(operation);
    return this;
  }

  resize(params: ResizeParams) {
    this.addOperation(new ResizeOperation(params));
    return this;
  }

  copy(src: GLTexture) {
    this.addOperation(new CopyOperation(src));
    return this;
  }

  blur(radius: number) {
    if (radius > 0) {
      this.addOperation(new BlurOperation({ radius, direction: [1, 0] }));
      this.addOperation(new BlurOperation({ radius, direction: [0, 1] }));
    }

    return this;
  }

  modulate(props: ModulateParams) {
    this.addOperation(new ModulateOperation(props));
    return this;
  }

  multiply(multiply: LinearInput) {
    return this.linear(multiply, 0);
  }

  add(add: LinearInput) {
    return this.linear(1, add);
  }

  linear(multiply: LinearInput, add: LinearInput = 0) {
    this.addOperation(
      new LinearOperation({
        multiply: toVec4(multiply, 1, 1),
        add: toVec4(add, 0, 0),
      }),
    );
    return this;
  }

  gamma(gamma: LinearInput = 2.2, gammaOut: LinearInput = 1) {
    const a = clampVec3Min(toVec3(gamma, 2.2), 0.0001);
    const b = clampVec3Min(toVec3(gammaOut, 1), 0.0001);
    const exponent: Vec3 = [b[0] / a[0], b[1] / a[1], b[2] / a[2]];
    this.addOperation(new GammaOperation({ exponent }));
    return this;
  }

  negate() {
    return this.linear([-1, -1, -1, 1], [1, 1, 1, 0]);
  }

  grayscale() {
    return this.modulate({ saturation: 0 });
  }

  tint(tint: ModulateParams["tint"]) {
    const multiply = toVec4(tint, 1, 1);
    return this.linear(multiply, toVec4(0, 0, 0));
  }

  lut(lut: LUTParams["lut"]) {
    this.addOperation(new LUTOperation({ lut }));
    return this;
  }

  color(color: Vec4) {
    this.addOperation(new ColorOperation(color));
    return this;
  }

  // Render
  private render() {
    let src = this.renderer.framebuffer();
    let dst = this.renderer.framebuffer();

    // Run operations
    for (const operation of this.operations) {
      operation.run({
        renderer: this.renderer,
        source: src.texture,
        target: dst,
      });

      // Swap buffers
      [src, dst] = [dst, src];

      // Resize target to source size
      dst.texture.resize(src.texture.width, src.texture.height);
    }

    // Resize canvas
    this.renderer.resize(src.texture.width, src.texture.height);

    // Copy source to canvas
    this.renderer.program(COPY).draw({
      source: src.texture,
    });
  }

  async toCanvas(target: HTMLCanvasElement) {
    this.render();

    const ctx = target.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get 2D context");
    }

    target.width = this.size.width;
    target.height = this.size.height;
    ctx.drawImage(this.canvas, 0, 0, target.width, target.height);
    return this;
  }

  async toBlob(type?: string, quality?: number): Promise<Blob> {
    this.render();
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject()),
        type,
        quality,
      );
    });
  }

  destroy() {
    this.renderer.dispose();
  }
}
