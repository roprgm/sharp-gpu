import { Regl } from "regl";
import { createFragmentCommand } from "./fragment";
import { RenderContext } from "../types";
import type { Vec4 } from "../utils/vector";

export type LinearParams = {
  multiply: Vec4;
  add: Vec4;
};

export function createLinearCommand(regl: Regl) {
  return createFragmentCommand<LinearParams>(regl, {
    frag: /* glsl */ `
      precision mediump float;
      uniform sampler2D src;
      uniform vec4 multiply;
      uniform vec4 add;
      varying vec2 uv;

      void main() {
        vec4 color = texture2D(src, uv);
        vec4 result = color * multiply + add;
        // Clamp only color channels to preserve intended alpha math
        result.rgb = clamp(result.rgb, 0.0, 1.0);
        result.a = clamp(result.a, 0.0, 1.0);
        gl_FragColor = result;
      }
    `,
    uniforms: {
      src: (ctx: RenderContext) => ctx.srcTexture,
      multiply: regl.prop<LinearParams, "multiply">("multiply"),
      add: regl.prop<LinearParams, "add">("add"),
    },
  });
}
