import { DefaultContext, Texture2D } from "regl";

export type Size = {
  width: number;
  height: number;
};

export type RenderContext = DefaultContext & {
  srcTexture: Texture2D;
  srcSize: Size;
};
