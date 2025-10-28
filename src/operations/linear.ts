import { GLTexture, GLProgramDefinition } from "../gl";
import { ProgramOperation, OperationContext } from "./base";
import { Vec4 } from "../utils/vector";

export type LinearUniforms = {
  source: GLTexture;
  multiply: Vec4;
  add: Vec4;
};

const linearProgram: GLProgramDefinition<LinearUniforms> = {
  frag: /* glsl */ `
    precision mediump float;
    uniform sampler2D source;
    uniform vec4 multiply;
    uniform vec4 add;
    varying vec2 uv;

    void main() {
      vec4 color = texture2D(source, uv);
      vec4 result = color * multiply + add;
      result.rgb = clamp(result.rgb, 0.0, 1.0);
      result.a = clamp(result.a, 0.0, 1.0);
      gl_FragColor = result;
    }
  `,
  uniforms: {
    source: (props) => props.source,
    multiply: (props) => props.multiply,
    add: (props) => props.add,
  },
};

export type LinearParams = {
  multiply?: Vec4;
  add?: Vec4;
};

export class LinearOperation extends ProgramOperation<LinearUniforms> {
  params: LinearParams;

  constructor(params: LinearParams = {}) {
    super(linearProgram);
    this.params = params;
  }

  getProps(ctx: OperationContext): LinearUniforms {
    if (!ctx.source) {
      throw new Error("Source texture is required");
    }

    return {
      source: ctx.source,
      multiply: this.params.multiply ?? [1, 1, 1, 1],
      add: this.params.add ?? [0, 0, 0, 0],
    };
  }
}
