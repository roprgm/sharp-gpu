import { Regl } from "regl";
import { createFragmentCommand } from "./fragment";
import { RenderContext } from "../types";
import type { Vec3 } from "../utils/vector";

export type GammaParams = {
  exponent: Vec3;
};

export function createGammaCommand(regl: Regl) {
  return createFragmentCommand<GammaParams>(regl, {
    frag: /* glsl */ `
      precision mediump float;
      uniform sampler2D src;
      uniform vec3 exponent;
      varying vec2 uv;

      void main() {
        vec4 color = texture2D(src, uv);
        vec3 base = max(color.rgb, vec3(0.0));
        vec3 rgb = pow(base, exponent);
        gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
      }
    `,
    uniforms: {
      src: (ctx: RenderContext) => ctx.srcTexture,
      exponent: regl.prop<GammaParams, "exponent">("exponent"),
    },
  });
}
