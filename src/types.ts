import { DefaultContext, Texture2D } from "regl";

export type RenderContext = DefaultContext & {
  srcTexture: Texture2D;
};

export type Size = {
  width: number;
  height: number;
};
