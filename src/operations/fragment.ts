import { DrawCommand, DrawConfig, Regl } from "regl";
import { RenderContext } from "../types";

export function createFragmentCommand<Params extends {} = {}>(
  regl: Regl,
  config: DrawConfig<{}, {}, Params>,
): DrawCommand<RenderContext, Params> {
  return regl<{}, {}, Params, {}, RenderContext>({
    frag: /* glsl */ `
      precision mediump float;
      varying vec2 uv;
      void main() {
        gl_FragColor = vec4(uv, 0, 1);
      }
    `,
    vert: /* glsl */ `
      precision mediump float;
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0, 1);
      }
    `,
    attributes: {
      position: [-1, -1, 1, -1, -1, 1, 1, 1],
    },
    count: 4,
    primitive: "triangle strip",
    ...config,
  });
}
