import type { GLContext } from "./renderer";

export type GLBufferTarget = "array" | "element";
export type GLBufferUsage = "static" | "dynamic" | "stream";
export type GLBufferData = ArrayBufferView | ArrayLike<number> | null;

export type GLBufferParams = {
  target?: GLBufferTarget;
  usage?: GLBufferUsage;
  data?: GLBufferData;
};

export class GLBuffer {
  private readonly gl: GLContext;
  private readonly handle: WebGLBuffer;

  target: GLBufferTarget = "array";
  usage: GLBufferUsage = "static";

  constructor(gl: GLContext, params: GLBufferParams = {}) {
    const handle = gl.createBuffer();
    if (!handle) {
      throw new Error("Failed to create buffer");
    }

    this.gl = gl;
    this.handle = handle;
    this.target = params.target ?? "array";
    this.usage = params.usage ?? "static";

    if (params.data !== null && params.data !== undefined) {
      this.update(params.data, params.usage);
    }
  }

  use(fn: () => void) {
    const { gl, handle, target } = this;
    const bindingEnum = mapBinding(gl, target);
    const targetEnum = mapTarget(gl, target);
    const previous = gl.getParameter(bindingEnum);
    gl.bindBuffer(targetEnum, handle);
    try {
      fn();
    } finally {
      gl.bindBuffer(targetEnum, previous);
    }
  }

  update(data: GLBufferData, usage: GLBufferUsage = this.usage) {
    const payload = normalizeData(data, this.target);
    const targetEnum = mapTarget(this.gl, this.target);
    const usageEnum = mapUsage(this.gl, usage);

    const gl = this.gl;
    this.use(() => {
      if (payload) {
        gl.bufferData(targetEnum, payload, usageEnum);
      } else {
        gl.bufferData(targetEnum, 0, usageEnum);
      }
    });

    this.usage = usage;
  }

  dispose() {
    this.gl.deleteBuffer(this.handle);
  }
}

function mapBinding(gl: GLContext, target: GLBufferTarget): number {
  if (target === "array") {
    return gl.ARRAY_BUFFER_BINDING;
  }
  switch (target) {
    case "element":
      return gl.ELEMENT_ARRAY_BUFFER_BINDING;
    default:
      return gl.ARRAY_BUFFER_BINDING;
  }
}

function mapTarget(gl: GLContext, target: GLBufferTarget): number {
  switch (target) {
    case "element":
      return gl.ELEMENT_ARRAY_BUFFER;
    default:
      return gl.ARRAY_BUFFER;
  }
}

function mapUsage(gl: GLContext, usage: GLBufferUsage): number {
  switch (usage) {
    case "dynamic":
      return gl.DYNAMIC_DRAW;
    case "stream":
      return gl.STREAM_DRAW;
    default:
      return gl.STATIC_DRAW;
  }
}

function normalizeData(
  data: GLBufferData,
  target: GLBufferTarget,
): ArrayBufferView | null {
  if (ArrayBuffer.isView(data)) {
    return data;
  }

  if (Array.isArray(data)) {
    if (target === "element") {
      return new Uint16Array(data);
    }
    return new Float32Array(data);
  }

  return null;
}
