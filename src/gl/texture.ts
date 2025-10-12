import type { GLContext } from "./renderer";

export type GLTextureFilter = "nearest" | "linear";
export type GLTextureWrap = "clamp" | "repeat" | "mirror";
export type GLTextureFormat =
  | "rgba"
  | "rgb"
  | "alpha"
  | "luminance"
  | "luminance-alpha";
export type GLTextureType = "uint8";
export type GLTextureSource = TexImageSource | ArrayBufferView | null;

export type GLTextureParams = {
  width?: number;
  height?: number;
  data?: GLTextureSource;
  format?: GLTextureFormat;
  type?: GLTextureType;
  wrapS?: GLTextureWrap;
  wrapT?: GLTextureWrap;
  minFilter?: GLTextureFilter;
  magFilter?: GLTextureFilter;
  flipY?: boolean;
};

export class GLTexture {
  readonly gl: GLContext;
  readonly handle: WebGLTexture;

  width: number;
  height: number;
  format: GLTextureFormat;
  type: GLTextureType;
  wrapS: GLTextureWrap;
  wrapT: GLTextureWrap;
  minFilter: GLTextureFilter;
  magFilter: GLTextureFilter;
  flipY: boolean;

  data: GLTextureSource;

  constructor(
    gl: GLContext,
    {
      width = 1,
      height = 1,
      data = null,
      format = "rgba",
      type = "uint8",
      wrapS = "clamp",
      wrapT = "clamp",
      minFilter = "linear",
      magFilter = "linear",
      flipY = false,
    }: GLTextureParams,
  ) {
    const handle = gl.createTexture();
    if (!handle) {
      throw new Error("Failed to create texture");
    }

    this.gl = gl;
    this.handle = handle;

    this.width = width;
    this.height = height;
    this.format = format;
    this.type = type;
    this.wrapS = wrapS;
    this.wrapT = wrapT;
    this.minFilter = minFilter;
    this.magFilter = magFilter;
    this.flipY = flipY;
    this.data = data;

    this.update({
      width,
      height,
      data,
      format,
      type,
      wrapS,
      wrapT,
      minFilter,
      magFilter,
      flipY,
    });
  }

  bind(unit = 0) {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.handle);
  }

  update(params: Partial<GLTextureParams>) {
    const gl = this.gl;

    const width = params.width ?? this.width;
    const height = params.height ?? this.height;
    if (width <= 0 || height <= 0) {
      throw new Error("Texture width and height must be positive");
    }

    const flipY = params.flipY ?? this.flipY;
    const minFilterParam = params.minFilter ?? this.minFilter;
    const magFilterParam = params.magFilter ?? this.magFilter;
    const wrapSParam = params.wrapS ?? this.wrapS;
    const wrapTParam = params.wrapT ?? this.wrapT;
    const formatParam = params.format ?? this.format;
    const typeParam = params.type ?? this.type;
    const data = params.data ?? this.data ?? null;

    const minFilter = mapFilter(gl, minFilterParam);
    const magFilter = mapFilter(gl, magFilterParam);
    const wrapS = mapWrap(gl, wrapSParam);
    const wrapT = mapWrap(gl, wrapTParam);
    const format = mapFormat(gl, formatParam);
    const type = mapType(gl, typeParam);

    const previousBinding = gl.getParameter(gl.TEXTURE_BINDING_2D) as
      | WebGLTexture
      | null;
    const previousFlipY = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL) as number;

    gl.bindTexture(gl.TEXTURE_2D, this.handle);

    try {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY ? 1 : 0);

      if (data && !ArrayBuffer.isView(data)) {
        gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, data);
      } else {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          format,
          width,
          height,
          0,
          format,
          type,
          data ?? null,
        );
      }
    } finally {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, previousFlipY);
      gl.bindTexture(gl.TEXTURE_2D, previousBinding);
    }

    this.width = width;
    this.height = height;
    this.format = formatParam;
    this.type = typeParam;
    this.wrapS = wrapSParam;
    this.wrapT = wrapTParam;
    this.minFilter = minFilterParam;
    this.magFilter = magFilterParam;
    this.flipY = flipY;
    this.data = data;
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new Error("Texture width and height must be positive");
    }
    this.width = width;
    this.height = height;
    this.update({ width, height, data: null });
  }

  dispose() {
    this.gl.deleteTexture(this.handle);
  }
}

function mapFilter(gl: GLContext, filter: GLTextureFilter): number {
  return filter === "nearest" ? gl.NEAREST : gl.LINEAR;
}

function mapWrap(gl: GLContext, wrap: GLTextureWrap): number {
  switch (wrap) {
    case "repeat":
      return gl.REPEAT;
    case "mirror":
      return gl.MIRRORED_REPEAT;
    default:
      return gl.CLAMP_TO_EDGE;
  }
}

function mapFormat(gl: GLContext, format: GLTextureFormat): number {
  switch (format) {
    case "rgb":
      return gl.RGB;
    case "alpha":
      return gl.ALPHA;
    case "luminance":
      return gl.LUMINANCE;
    case "luminance-alpha":
      return gl.LUMINANCE_ALPHA;
    default:
      return gl.RGBA;
  }
}

function mapType(gl: GLContext, type: GLTextureType): number {
  if (type !== "uint8") {
    throw new Error("Unsupported texture type");
  }
  return gl.UNSIGNED_BYTE;
}
