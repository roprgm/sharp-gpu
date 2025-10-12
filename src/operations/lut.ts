import { GLTexture, GLProgramDefinition } from "../gl";
import { ProgramOperation, OperationContext } from "./basic";

export type LUTParams = {
  lut?: number[] | ((x: number) => number);
};

export type LUTUniforms = {
  source: GLTexture;
  lut: GLTexture;
};

const lutProgram: GLProgramDefinition<LUTUniforms> = {
  frag: /* glsl */ `
    precision mediump float;
    uniform sampler2D source;
    uniform sampler2D lut;
    varying vec2 uv;

    const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

    void main() {
      vec4 color = texture2D(source, uv);
      float lum = dot(color.rgb, LUMA);
      float newLum = texture2D(lut, vec2(lum, 0.0)).r;
      float scale = lum > 1e-5 ? newLum / lum : 0.0;
      vec3 result = color.rgb * scale;
      gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
    }
  `,
  uniforms: {
    source: (props) => props.source,
    lut: (props) => props.lut,
  },
};

function createLerp(src: number[]) {
  const n = src.length;
  return (t: number) => {
    if (t <= 0) return src[0];
    if (t >= 1) return src[n - 1];
    const pos = t * (n - 1);
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = src[idx];
    const b = src[Math.min(idx + 1, n - 1)];
    return a + (b - a) * frac;
  };
}

export class LUTOperation extends ProgramOperation<LUTUniforms> {
  private lut?: LUTParams["lut"];
  private texture?: GLTexture;
  private lastLut?: LUTParams["lut"];
  private readonly data = new Uint8ClampedArray(256);

  constructor(params: LUTParams = {}) {
    super(lutProgram);
    this.lut = params.lut;
  }

  private ensureTexture(ctx: OperationContext) {
    if (!this.texture) {
      this.texture = ctx.gl.texture({
        width: 256,
        height: 1,
        format: "luminance",
        data: this.data,
        minFilter: "linear",
        magFilter: "linear",
        wrapS: "clamp",
        wrapT: "clamp",
      });
    }
    return this.texture;
  }

  private updateTexture(lut: LUTParams["lut"]) {
    const target = lut ?? [0, 1];
    if (target === this.lastLut) {
      return;
    }
    this.lastLut = target;

    const interpolate =
      typeof target === "function" ? target : createLerp(target);
    for (let i = 0; i < 256; i++) {
      this.data[i] = interpolate(i / 255) * 255;
    }

    this.texture?.update({
      data: this.data,
    });
  }

  getProps(ctx: OperationContext): LUTUniforms {
    if (!ctx.source) {
      throw new Error("Source texture is required");
    }
    const texture = this.ensureTexture(ctx);
    this.updateTexture(this.lut);

    return {
      source: ctx.source,
      lut: texture,
    };
  }

  dispose() {
    this.texture?.dispose();
  }
}
