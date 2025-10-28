import { GLProgramDefinition, GLTexture } from "../gl";
import { OperationContext, ProgramOperation } from "./basic";

export type BlurProps = {
  source: GLTexture;
  radius?: number;
  direction?: [number, number];
};

const blur: GLProgramDefinition<BlurProps> = {
  frag: /* glsl */ `
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D src;
    uniform float width;
    uniform float height;
    uniform vec2 direction;
    uniform float radius;

    #define MAX_RADIUS 32

    void main() {
      vec2 texel = direction / vec2(width, height);
      vec4 color = vec4(0.0);
      float total = 0.0;

      float r = min(radius, float(MAX_RADIUS));
      int radiusInt = int(r);

      for (int i = -MAX_RADIUS; i <= MAX_RADIUS; i++) {
        if (i < -radiusInt || i > radiusInt) continue;
        float fi = float(i);
        float w = exp(-0.5 * (fi * fi) / (r * r + 0.0001));
        color += texture2D(src, uv + texel * fi) * w;
        total += w;
      }

      gl_FragColor = color / total;
    }
  `,
  uniforms: {
    src: (props) => props.source,
    width: (props) => props.source.width,
    height: (props) => props.source.height,
    direction: (props) => props.direction ?? [1, 0],
    radius: (props) => props.radius ?? 0,
  },
};

export type BlurOperationProps = {
  radius?: number;
  direction?: [number, number];
};

export class BlurOperation extends ProgramOperation<BlurProps> {
  radius: number;
  direction: [number, number];

  constructor(props: BlurOperationProps = {}) {
    super(blur);
    this.radius = props.radius ?? 0;
    this.direction = props.direction ?? [0, 1];
  }

  run(ctx: OperationContext) {
    if (this.radius === 0) {
      return;
    }

    const source = ctx.source;

    if (!source) {
      throw new Error("Source texture is required");
    }

    const program = ctx.gl.program(blur);

    ctx.target.use(() => {
      program.draw({
        source,
        radius: this.radius,
        direction: this.direction,
      });
    });
  }
}
