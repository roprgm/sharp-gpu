import type { DrawCommand, Regl } from "regl";
import { createBlurCommand } from "./operations/blur";
import { createGammaCommand } from "./operations/gamma";
import { createLinearCommand } from "./operations/linear";
import { createLUTCommand } from "./operations/lut";
import { createMapCommand } from "./operations/map";
import { createModulateCommand } from "./operations/modulate";
import type { RenderContext } from "./types";

export type GPUCommand = DrawCommand<RenderContext>;

export class RenderCommands {
  map: GPUCommand;
  blur: GPUCommand;
  modulate: GPUCommand;
  lut: GPUCommand;
  linear: GPUCommand;
  gamma: GPUCommand;

  constructor(regl: Regl) {
    this.map = createMapCommand(regl);
    this.blur = createBlurCommand(regl);
    this.modulate = createModulateCommand(regl);
    this.lut = createLUTCommand(regl);
    this.linear = createLinearCommand(regl);
    this.gamma = createGammaCommand(regl);
  }
}
