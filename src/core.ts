import type { Size } from "./utils/size";
import { PipelineOperation } from "./operations/pipeline";
import { GLRenderer, GLTexture } from "./gl";
import { clampVec3Min, toVec3, toVec4, Vec3, Vec4 } from "./utils/vector";

import { COPY } from "./programs";
import { computeSize, ResizeParams } from "./utils/size";
import { CopyOperation, ResizeOperation } from "./operations/basic";
import { BlurOperation } from "./operations/blur";
import { ModulateOperation, ModulateParams } from "./operations/modulate";
import { GammaOperation } from "./operations/gamma";
import { LinearOperation } from "./operations/linear";
import { LUTOperation, LUTParams } from "./operations/lut";

type ImageSource = string;
type LinearInput = number | Vec3 | Vec4;

type SharpGPUParams = {
  gl?: GLRenderer;
  pipeline?: PipelineOperation;
};

export class SharpGPU {
  gl: GLRenderer;

  private pipeline: PipelineOperation;

  constructor(params: SharpGPUParams = {}) {
    this.gl = params.gl ?? new GLRenderer();
    this.pipeline = params.pipeline ?? new PipelineOperation(this.gl);
  }

  static async from(src: ImageSource) {
    return new SharpGPU().loadImage(src);
  }

  get canvas() {
    return this.gl.canvas;
  }

  get size(): Size {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  clone() {
    return new SharpGPU({
      gl: this.gl,
      pipeline: this.pipeline.clone(),
    });
  }

  async loadImage(src: ImageSource) {
    const image = new Image();
    image.src = src;
    await image.decode();

    const texture = this.gl.texture({
      width: image.width,
      height: image.height,
      data: image,
      flipY: true,
    });

    this.resize({ width: image.width, height: image.height });
    return this.copy(texture);
  }

  // Operations
  resize(size: ResizeParams) {
    const computed = computeSize(this.size, size);
    this.pipeline.add(new ResizeOperation(computed));
    this.gl.resize(computed.width, computed.height);
    return this;
  }

  copy(src: GLTexture) {
    this.pipeline.add(new CopyOperation(src));
    return this;
  }

  blur(radius: number) {
    if (radius > 0) {
      this.pipeline.add(new BlurOperation({ radius, direction: [1, 0] }));
      this.pipeline.add(new BlurOperation({ radius, direction: [0, 1] }));
    }

    return this;
  }

  modulate(props: ModulateParams) {
    this.pipeline.add(new ModulateOperation(props));
    return this;
  }

  multiply(multiply: LinearInput) {
    return this.linear(multiply, 0);
  }

  add(add: LinearInput) {
    return this.linear(1, add);
  }

  linear(multiply: LinearInput, add: LinearInput = 0) {
    this.pipeline.add(
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
    this.pipeline.add(new GammaOperation({ exponent }));
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
    this.pipeline.add(new LUTOperation({ lut }));
    return this;
  }

  private render() {
    const target = this.gl.framebuffer();

    const source = this.gl.texture({
      width: this.size.width,
      height: this.size.height,
    });

    this.pipeline.run({
      gl: this.gl,
      source,
      target,
    });

    this.gl.resize(target.texture.width, target.texture.height);

    this.gl.program(COPY).draw({
      source: target.texture,
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
    this.pipeline.dispose();
    this.gl.dispose();
  }
}
