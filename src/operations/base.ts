import {
  GLRenderer,
  GLProgramDefinition,
  GLTexture,
  GLFramebuffer,
} from "../gl";

import { COPY } from "../programs";

export type OperationContext = {
  renderer: GLRenderer;
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
    const program = ctx.renderer.program(this.definition);
    ctx.target.use(() => {
      program.draw(this.getProps(ctx));
    });
  }
}

export class CopyOperation extends ProgramOperation<{ source: GLTexture }> {
  source: GLTexture;

  constructor(source: GLTexture) {
    super(COPY);
    this.source = source;
  }

  getProps() {
    return { source: this.source };
  }
}
