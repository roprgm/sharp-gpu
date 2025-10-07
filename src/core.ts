import createREGL, { Regl, Texture2D } from "regl";
import { RenderCommands, GPUCommand } from "./commands";
import { FBO } from "./utils/fbo";
import { RenderContext, Size } from "./types";
import { computeSize, ResizeParams } from "./utils/resize";
import { clampVec3Min, toVec3, toVec4, Vec3, Vec4 } from "./utils/vector";
import type { ModulateParams } from "./operations/modulate";
import type { LUTParams } from "./operations/lut";

type ImageSource = string;

type LinearInput = number | Vec3 | Vec4;

type PipelineItem = {
  cmd: GPUCommand;
  size?: Size;
  params?: Record<string, unknown>;
};

type ShareGPUParams = {
  regl?: Regl;
  pipeline?: PipelineItem[];
  fboA?: FBO;
  fboB?: FBO;
};

export class SharpGPU {
  private regl: Regl;
  private pipeline: PipelineItem[] = [];

  private fboA: FBO;
  private fboB: FBO;
  private lastSize: Size;

  private commands: RenderCommands;

  constructor(params?: ShareGPUParams) {
    params = params ?? {};

    if (!params.regl) {
      const canvas = document.createElement("canvas");
      this.regl = createREGL({
        canvas,
        attributes: {
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          depth: false,
        },
      });
    } else {
      this.regl = params.regl;
    }

    this.pipeline = params.pipeline ?? [];
    this.fboA = params.fboA ?? new FBO(this.regl, this.size);
    this.fboB = params.fboB ?? new FBO(this.regl, this.size);
    this.commands = new RenderCommands(this.regl);
    this.lastSize = this.size;
  }

  static async from(src: ImageSource) {
    return new SharpGPU().loadImage(src);
  }

  clone() {
    return new SharpGPU({
      regl: this.regl,
      pipeline: [...this.pipeline],
      fboA: this.fboA,
      fboB: this.fboB,
    });
  }

  clean() {
    this.pipeline = [];
    return this;
  }

  async loadImage(src: ImageSource) {
    const image = new Image();
    image.src = src;
    await image.decode();
    const texture = this.regl.texture({ data: image, flipY: true });
    return this.resize({ width: image.width, height: image.height }).map(
      texture,
    );
  }

  get canvas() {
    return this.regl._gl.canvas as HTMLCanvasElement;
  }

  get size() {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  private resizeCanvas(size: Size) {
    if (
      this.canvas.width === size.width &&
      this.canvas.height === size.height
    ) {
      return;
    }
    this.canvas.width = size.width;
    this.canvas.height = size.height;
  }

  private swapFBOs() {
    [this.fboA, this.fboB] = [this.fboB, this.fboA];
  }

  /** Render all operations to framebuffers */
  private async render() {
    this.regl.poll();

    for (const item of this.pipeline) {
      if (item.size) {
        this.fboB.resize(item.size);
      }

      this.regl.poll();

      const cmd = this.regl<RenderContext>({
        framebuffer: this.fboB.buffer,
        context: {
          srcTexture: this.fboA.texture,
          srcSize: this.fboA.size,
        },
      });

      cmd(() => {
        this.regl.clear({ color: [0, 0, 0, 1], depth: 1 });
        item.cmd({ ...item.params });
      });

      this.fboA.resize(this.fboB.size);
      this.swapFBOs();
    }

    this.resizeCanvas(this.fboA.size);
    this.regl.poll();

    this.commands.map({ src: this.fboA.texture });
  }

  pipe(item: PipelineItem) {
    this.pipeline.push(item);
    return this;
  }

  // Commands
  resize(params: ResizeParams) {
    this.lastSize = computeSize(this.lastSize, params);
    return this.pipe({
      cmd: this.commands.map,
      size: this.lastSize,
    });
  }

  map(src: Texture2D) {
    return this.pipe({
      cmd: this.commands.map,
      params: { src },
    });
  }

  blur(radius: number) {
    if (radius > 0) {
      this.pipe({
        cmd: this.commands.blur,
        params: { radius, direction: [1, 0] },
      });
      this.pipe({
        cmd: this.commands.blur,
        params: { radius, direction: [0, 1] },
      });
    }

    return this;
  }

  modulate(params: ModulateParams) {
    return this.pipe({
      cmd: this.commands.modulate,
      params,
    });
  }

  multiply(multiply: LinearInput) {
    return this.linear(multiply, 0);
  }

  add(add: LinearInput) {
    return this.linear(1, add);
  }

  linear(multiply: LinearInput, add: LinearInput = 0) {
    return this.pipe({
      cmd: this.commands.linear,
      params: {
        multiply: toVec4(multiply, 1, 1),
        add: toVec4(add, 0, 0),
      },
    });
  }

  gamma(gamma: LinearInput = 2.2, gammaOut: LinearInput = 1) {
    const gammaVec = clampVec3Min(toVec3(gamma, 2.2), 0.0001);
    const gammaOutVec = clampVec3Min(toVec3(gammaOut, 1), 0.0001);
    const exponent: Vec3 = [
      gammaOutVec[0] / gammaVec[0],
      gammaOutVec[1] / gammaVec[1],
      gammaOutVec[2] / gammaVec[2],
    ];

    return this.pipe({
      cmd: this.commands.gamma,
      params: { exponent },
    });
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
    return this.pipe({
      cmd: this.commands.lut,
      params: { lut },
    });
  }

  /** Render the result to a canvas */
  async toCanvas(target: HTMLCanvasElement) {
    await this.render();

    if (
      target.width !== this.canvas.width ||
      target.height !== this.canvas.height
    ) {
      target.width = this.canvas.width;
      target.height = this.canvas.height;
    }

    const ctx = target.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context");
    }

    ctx.drawImage(this.canvas, 0, 0, target.width, target.height);
    return this;
  }

  async toBlob(type?: string, quality?: number): Promise<Blob> {
    await this.render();
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject()),
        type,
        quality,
      );
    });
  }

  destroy() {
    this.fboA.destroy();
    this.fboB.destroy();
    this.regl.destroy();
  }
}
