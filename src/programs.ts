import type { GLProgramDefinition, GLTexture } from "./gl";
import { Vec4 } from "./utils/vector";

export const COPY: GLProgramDefinition<{ source: GLTexture }> = {
  frag: /* glsl */ `
    precision mediump float;
    uniform sampler2D source;
    varying vec2 uv;
    
    void main() {
      gl_FragColor = texture2D(source, uv);
    }
  `,
  uniforms: {
    source: (props) => props.source,
  },
};

export const COLOR: GLProgramDefinition<{ color: Vec4 }> = {
  frag: /* glsl */ `
    precision mediump float;
    uniform vec4 color;

    void main() {
      gl_FragColor = color;
    }
  `,
  uniforms: {
    color: (props) => props.color,
  },
  blend: {
    enabled: true,
    srcFactor: "srcColor",
    dstFactor: "oneMinusSrcColor",
    equation: "add",
  },
};
