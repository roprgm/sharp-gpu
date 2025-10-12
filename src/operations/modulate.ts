import { GLTexture, GLProgramDefinition } from "../gl";
import { Vec3 } from "../utils/vector";
import { ProgramOperation, type OperationContext } from "./basic";

export type ModulateUniforms = {
  source: GLTexture;
  brightness: number;
  saturation: number;
  hue: number;
  lightness: number;
  tint: [number, number, number];
};

const modulateProgram: GLProgramDefinition<ModulateUniforms> = {
  frag: /* glsl */ `
    precision mediump float;
    uniform sampler2D source;
    uniform float brightness;
    uniform float saturation;
    uniform float hue;
    uniform float lightness;
    uniform vec3 tint;
    varying vec2 uv;

    vec3 rgb2hsl(vec3 c) {
      float maxc = max(max(c.r, c.g), c.b);
      float minc = min(min(c.r, c.g), c.b);
      float l = (maxc + minc) * 0.5;
      float s = 0.0;
      float h = 0.0;
      if (maxc != minc) {
        float d = maxc - minc;
        s = l > 0.5 ? d / (2.0 - maxc - minc) : d / (maxc + minc);
        if (maxc == c.r) {
          h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
        } else if (maxc == c.g) {
          h = (c.b - c.r) / d + 2.0;
        } else {
          h = (c.r - c.g) / d + 4.0;
        }
        h /= 6.0;
      }
      return vec3(h, s, l);
    }

    float hue2rgb(float p, float q, float t) {
      if (t < 0.0) t += 1.0;
      if (t > 1.0) t -= 1.0;
      if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
      if (t < 1.0 / 2.0) return q;
      if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
      return p;
    }

    vec3 hsl2rgb(vec3 hsl) {
      float h = hsl.x;
      float s = hsl.y;
      float l = hsl.z;
      float r, g, b;

      if (s == 0.0) {
        r = g = b = l;
      } else {
        float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
        float p = 2.0 * l - q;
        r = hue2rgb(p, q, h + 1.0 / 3.0);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1.0 / 3.0);
      }
      return vec3(r, g, b);
    }

    void main() {
      vec4 color = texture2D(source, uv);
      vec3 hsl = rgb2hsl(color.rgb);

      hsl.x = mod(hsl.x + hue / 360.0, 1.0);
      hsl.y *= saturation;
      hsl.z = clamp(hsl.z + lightness, 0.0, 1.0);

      vec3 rgb = hsl2rgb(hsl);
      rgb *= brightness;
      rgb *= tint;

      gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
    }
  `,
  uniforms: {
    source: (props) => props.source,
    brightness: (props) => props.brightness,
    saturation: (props) => props.saturation,
    hue: (props) => props.hue,
    lightness: (props) => props.lightness,
    tint: (props) => props.tint,
  },
};

export type ModulateParams = {
  brightness?: number;
  saturation?: number;
  lightness?: number;
  hue?: number;
  tint?: Vec3;
};

export class ModulateOperation extends ProgramOperation<ModulateUniforms> {
  params: ModulateParams;

  constructor(params: ModulateParams = {}) {
    super(modulateProgram);
    this.params = params;
  }

  getProps(ctx: OperationContext): ModulateUniforms {
    if (!ctx.source) {
      throw new Error("Source texture is required");
    }

    return {
      source: ctx.source,
      brightness: this.params.brightness ?? 1,
      saturation: this.params.saturation ?? 1,
      hue: this.params.hue ?? 0,
      lightness: this.params.lightness ?? 0,
      tint: this.params.tint ?? [1, 1, 1],
    };
  }
}
