import { Regl, Texture2D, Texture2DOptions } from "regl";

import { RenderContext } from "../types";
import { createFragmentCommand } from "./fragment";

export type LUTParams = {
  lut: number[] | ((x: number) => number);
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

export function createLUTCommand(regl: Regl) {
  const data = new Uint8ClampedArray(256);

  let lutTexture: Texture2D = regl.texture({
    width: 256,
    height: 1,
    format: "luminance",
    type: "uint8",
    wrap: "clamp",
  });

  let lastLut: LUTParams["lut"];

  const updateTexture = (lut: LUTParams["lut"]) => {
    if (lut === lastLut) {
      return lutTexture;
    }

    lastLut = lut;

    const interpolate = typeof lut === "function" ? lut : createLerp(lut);
    for (let i = 0; i < 256; i++) {
      data[i] = interpolate(i / 255) * 255;
    }

    const params: Texture2DOptions = {
      data,
      width: data.length,
      height: 1,
      format: "luminance",
      type: "uint8",
      wrap: "clamp",
      min: "linear",
      mag: "linear",
    };

    lutTexture(params);

    return lutTexture;
  };

  return createFragmentCommand<LUTParams>(regl, {
    frag: /* glsl */ `
      precision mediump float;
      uniform sampler2D src;
      uniform sampler2D lut;
      varying vec2 uv;

      const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

      void main() {
        vec4 color = texture2D(src, uv);

        // Compute current luminance (Rec.709)
        float lum = dot(color.rgb, LUMA);

        // Sample the LUT
        float newLum = texture2D(lut, vec2(lum, 0.0)).r;

        // Preserve hue by rescaling RGB to match new luminance
        float scale = lum > 1e-5 ? newLum / lum : 0.0;
        vec3 result = color.rgb * scale;

        gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
      }
    `,
    uniforms: {
      src: (ctx: RenderContext) => ctx.srcTexture,
      lut: (_ctx: RenderContext, props: LUTParams) => {
        updateTexture(props.lut ?? [0, 1]);
        return lutTexture;
      },
    },
  });
}
