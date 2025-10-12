import { GLTexture, GLProgramDefinition } from "../gl";
import { ProgramOperation, OperationContext } from "./basic";
import { Vec3 } from "../utils/vector";

export type GammaUniforms = {
  source: GLTexture;
  exponent: Vec3;
};

const gammaProgram: GLProgramDefinition<GammaUniforms> = {
  frag: /* glsl */ `
    precision mediump float;
    uniform sampler2D source;
    uniform vec3 exponent;
    varying vec2 uv;

    void main() {
      vec4 color = texture2D(source, uv);
      vec3 base = max(color.rgb, vec3(0.0));
      vec3 rgb = pow(base, exponent);
      gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
    }
  `,
  uniforms: {
    source: (props) => props.source,
    exponent: (props) => props.exponent,
  },
};

export type GammaParams = {
  exponent?: Vec3;
};

export class GammaOperation extends ProgramOperation<GammaUniforms> {
  private exponent: Vec3;

  constructor(options: GammaParams = {}) {
    super(gammaProgram);
    this.exponent = options.exponent ?? [1, 1, 1];
  }

  getProps(ctx: OperationContext): GammaUniforms {
    if (!ctx.source) {
      throw new Error("Source texture is required");
    }

    return {
      source: ctx.source,
      exponent: this.exponent,
    };
  }
}
