import { Regl } from "regl";
import { createFragmentCommand } from "./fragment";
import { RenderContext } from "../types";

export type ModulateParams = {
  brightness?: number;
  saturation?: number;
  hue?: number; // degrees
  lightness?: number;
  tint?: [number, number, number]; // normalized RGB tint
};

export function createModulateCommand(regl: Regl) {
  return createFragmentCommand<ModulateParams>(regl, {
    frag: /* glsl */ `
      precision mediump float;
      uniform sampler2D src;
      uniform float brightness;
      uniform float saturation;
      uniform float hue; // degrees
      uniform float lightness;
      uniform vec3 tint;
      varying vec2 uv;

      // RGB -> HSL
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

      // HSL -> RGB helpers
      float hue2rgb(float p, float q, float t) {
        if (t < 0.0) t += 1.0;
        if (t > 1.0) t -= 1.0;
        if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
        if (t < 1.0/2.0) return q;
        if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
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
          r = hue2rgb(p, q, h + 1.0/3.0);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1.0/3.0);
        }
        return vec3(r, g, b);
      }

      void main() {
        vec4 color = texture2D(src, uv);
        vec3 hsl = rgb2hsl(color.rgb);

        // Hue rotation (degrees → normalized)
        hsl.x = mod(hsl.x + hue / 360.0, 1.0);
        // Saturation and lightness
        hsl.y *= saturation;
        hsl.z = clamp(hsl.z + lightness, 0.0, 1.0);

        // Convert back to RGB
        vec3 rgb = hsl2rgb(hsl);

        // Apply brightness
        rgb *= brightness;

        // Apply tint
        rgb *= tint;

        // Clamp and output
        gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
      }
    `,
    uniforms: {
      src: (ctx: RenderContext) => ctx.srcTexture,
      brightness: regl.prop<ModulateParams, "brightness">("brightness"),
      saturation: regl.prop<ModulateParams, "saturation">("saturation"),
      hue: regl.prop<ModulateParams, "hue">("hue"),
      lightness: regl.prop<ModulateParams, "lightness">("lightness"),
      tint: regl.prop<ModulateParams, "tint">("tint"),
    },
  });
}
