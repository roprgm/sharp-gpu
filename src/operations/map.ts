import { Regl, Texture2D } from "regl";
import { createFragmentCommand } from "./fragment";
import { RenderContext } from "../types";

export type MapOpParams = { src?: Texture2D };

export function createMapCommand(regl: Regl) {
  return createFragmentCommand(regl, {
    frag: /* glsl */ `
      precision mediump float;
      uniform sampler2D src;
      varying vec2 uv;
      void main() {
        gl_FragColor = texture2D(src, uv);
      }
    `,
    uniforms: {
      src: (ctx: RenderContext, props?: MapOpParams) => {
        return props?.src ?? ctx.srcTexture;
      },
    },
  });
}
