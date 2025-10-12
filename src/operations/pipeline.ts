import { GLRenderer, GLFramebuffer } from "../gl";
import { BaseOperation, OperationContext } from "./basic";
import { COPY } from "../programs";

export type PipelineOperationParams = {
  operations: BaseOperation[];
};

export class PipelineOperation extends BaseOperation {
  gl: GLRenderer;
  operations: BaseOperation[] = [];

  private src?: GLFramebuffer;
  private dst?: GLFramebuffer;

  constructor(gl: GLRenderer, operations?: BaseOperation[]) {
    super();
    this.gl = gl;
    this.operations = operations ?? [];
  }

  clone() {
    return new PipelineOperation(this.gl, [...this.operations]);
  }

  add(item: BaseOperation) {
    this.operations.push(item);
    return this;
  }

  run(ctx: OperationContext) {
    if (!this.src) {
      this.src = ctx.gl.framebuffer({
        width: ctx.target.size.width,
        height: ctx.target.size.height,
      });
    }

    if (!this.dst) {
      this.dst = ctx.gl.framebuffer({
        width: ctx.target.size.width,
        height: ctx.target.size.height,
      });
    }

    for (const item of this.operations) {
      item.run({
        gl: ctx.gl,
        source: this.src.texture,
        target: this.dst,
      });

      [this.src, this.dst] = [this.dst, this.src];
    }

    // Copy source to target
    const src = this.src;
    ctx.target.use(() => {
      ctx.gl.program(COPY).draw({
        source: src.texture,
      });
    });
  }

  dispose() {
    this.src?.dispose();
    this.dst?.dispose();
  }
}
