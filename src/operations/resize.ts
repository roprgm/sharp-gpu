import { GLTexture } from "../gl";

import { COPY } from "../programs";
import { OperationContext, ProgramOperation } from "./base";

export type Size = {
  width: number;
  height: number;
};

export type ResizeParams = {
  width?: number;
  height?: number;
};

export function computeSize(srcSize: Size, params: ResizeParams) {
  if (params.width && params.height) {
    return { width: params.width, height: params.height };
  }

  const aspect = srcSize.width / srcSize.height;

  if (params.width) {
    return { width: params.width, height: params.width / aspect };
  }

  if (params.height) {
    return { width: params.height * aspect, height: params.height };
  }

  return srcSize;
}

export class ResizeOperation extends ProgramOperation<{
  source: GLTexture;
}> {
  params: ResizeParams;

  constructor(params: ResizeParams) {
    super(COPY);
    this.params = params;
  }

  getProps(ctx: OperationContext) {
    if (!ctx.source) {
      throw new Error("Source texture is required");
    }

    return { source: ctx.source };
  }

  run(ctx: OperationContext) {
    const previous = {
      width: ctx.target.texture.width,
      height: ctx.target.texture.height,
    };
    const size = computeSize(previous, this.params);
    ctx.target.texture.resize(size.width, size.height);
    super.run(ctx);
  }
}
