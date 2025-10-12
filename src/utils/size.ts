export type Size = {
  width: number;
  height: number;
};

export type ResizeParams = {
  width?: number;
  height?: number;
};

export function computeSize(srcSize: Size, params: ResizeParams) {
  if (params.width && params.height) {
    return { width: params.width, height: params.height };
  }

  const aspect = srcSize.width / srcSize.height;

  if (params.width) {
    return { width: params.width, height: params.width / aspect };
  }

  if (params.height) {
    return { width: params.height * aspect, height: params.height };
  }

  return srcSize;
}
