import { GLRenderer } from "../gl/renderer";
import { GLProgramDefinition } from "../gl/program";
import { GLTexture } from "../gl/texture";
import { Size } from "../utils/size";
import { Vec4 } from "../utils/vector";

import * as Programs from "../programs";
import { GLFramebuffer } from "../gl";

export type OperationContext = {
  gl: GLRenderer;
  source?: GLTexture;
  target: GLFramebuffer;
};

export abstract class BaseOperation {
  abstract run(ctx: OperationContext): void;
}

export class ProgramOperation<Props extends {} = {}> extends BaseOperation {
  definition: GLProgramDefinition<Props>;

  constructor(definition: GLProgramDefinition<Props>) {
    super();
    this.definition = definition;
  }

  getProps(_ctx: OperationContext): Props {
    return {} as Props;
  }

  run(ctx: OperationContext) {
    const program = ctx.gl.program(this.definition);
    ctx.target.use(() => {
      program.draw(this.getProps(ctx));
    });
  }
}

export class ColorOperation extends ProgramOperation<{ color: Vec4 }> {
  color: Vec4;
  constructor(color: Vec4) {
    super(Programs.COLOR);
    this.color = color;
  }

  getProps() {
    return { color: this.color };
  }
}

export class CopyOperation extends ProgramOperation<{ source: GLTexture }> {
  source: GLTexture;

  constructor(source: GLTexture) {
    super(Programs.COPY);
    this.source = source;
  }

  getProps() {
    return { source: this.source };
  }
}

export class ResizeOperation extends ProgramOperation<{
  source: GLTexture;
}> {
  size: Size;

  constructor(size: Size) {
    if (!size.width || !size.height) {
      throw new Error("Size must be greater than 0");
    }

    super(Programs.COPY);
    this.size = size;
  }

  getProps(ctx: OperationContext) {
    if (!ctx.source) {
      throw new Error("Source texture is required");
    }

    return { source: ctx.source };
  }

  run(ctx: OperationContext) {
    ctx.target.resize(this.size);
    super.run(ctx);
  }
}
