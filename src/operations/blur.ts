import { Regl } from "regl";
import { createFragmentCommand } from "./fragment";
import { RenderContext } from "../types";

export type BlurParams = {
  direction: [number, number];
  radius: number;
};

export function createBlurCommand(regl: Regl) {
  return createFragmentCommand<BlurParams>(regl, {
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

        // Clamp radius to MAX_RADIUS to avoid excessive loop
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
      src: (ctx: RenderContext) => ctx.srcTexture,
      width: (ctx: RenderContext) => ctx.viewportWidth,
      height: (ctx: RenderContext) => ctx.viewportHeight,
      direction: regl.prop<BlurParams, "direction">("direction"),
      radius: regl.prop<BlurParams, "radius">("radius"),
    },
  });
}
