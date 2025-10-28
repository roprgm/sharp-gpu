// Generic type for WebGL context
export type GLContext = WebGLRenderingContext | WebGL2RenderingContext;

// Map WebGL constants to human-readable values
export const glMap = (gl: GLContext) => ({
  format: {
    rgba: gl.RGBA,
    rgb: gl.RGB,
    alpha: gl.ALPHA,
    luminance: gl.LUMINANCE,
    luminanceAlpha: gl.LUMINANCE_ALPHA,
  },
  type: {
    uint8: gl.UNSIGNED_BYTE,
    float: gl.FLOAT,
  },
  wrap: {
    clamp: gl.CLAMP_TO_EDGE,
    repeat: gl.REPEAT,
    mirror: gl.MIRRORED_REPEAT,
  },
  filter: {
    nearest: gl.NEAREST,
    linear: gl.LINEAR,
  },
  attributeType: {
    float: gl.FLOAT,
    byte: gl.BYTE,
    short: gl.SHORT,
    unsignedByte: gl.UNSIGNED_BYTE,
    unsignedShort: gl.UNSIGNED_SHORT,
  },
  indexType: {
    uint8: gl.UNSIGNED_BYTE,
    uint16: gl.UNSIGNED_SHORT,
    uint32: gl.UNSIGNED_INT,
  },
  blendFactor: {
    zero: gl.ZERO,
    one: gl.ONE,
    srcColor: gl.SRC_COLOR,
    oneMinusSrcColor: gl.ONE_MINUS_SRC_COLOR,
    dstColor: gl.DST_COLOR,
    oneMinusDstColor: gl.ONE_MINUS_DST_COLOR,
  },
  blendEquation: {
    add: gl.FUNC_ADD,
    subtract: gl.FUNC_SUBTRACT,
    reverseSubtract: gl.FUNC_REVERSE_SUBTRACT,
  },
  primitive: {
    points: gl.POINTS,
    lines: gl.LINES,
    lineStrip: gl.LINE_STRIP,
    lineLoop: gl.LINE_LOOP,
    triangleStrip: gl.TRIANGLE_STRIP,
    triangleFan: gl.TRIANGLE_FAN,
  },
  drawMode: {
    points: gl.POINTS,
    lines: gl.LINES,
    lineStrip: gl.LINE_STRIP,
    lineLoop: gl.LINE_LOOP,
    triangleStrip: gl.TRIANGLE_STRIP,
    triangleFan: gl.TRIANGLE_FAN,
  },
  bufferTarget: {
    array: gl.ARRAY_BUFFER,
    element: gl.ELEMENT_ARRAY_BUFFER,
  },
  bufferUsage: {
    static: gl.STATIC_DRAW,
    dynamic: gl.DYNAMIC_DRAW,
    stream: gl.STREAM_DRAW,
  },
});

export type GLMap = ReturnType<typeof glMap>;

// Texture
export type GLTextureSource = TexImageSource | ArrayBufferView | null;

export type GLTextureParams = {
  width: number;
  height: number;
  data: GLTextureSource;
  format: keyof GLMap["format"];
  type: keyof GLMap["type"];
  wrapS: keyof GLMap["wrap"];
  wrapT: keyof GLMap["wrap"];
  minFilter: keyof GLMap["filter"];
  magFilter: keyof GLMap["filter"];
  flipY: boolean;
};

export class GLTexture {
  readonly gl: GLContext;
  readonly handle: WebGLTexture;

  params: GLTextureParams = {
    width: 1,
    height: 1,
    data: null,
    format: "rgba",
    type: "uint8",
    wrapS: "clamp",
    wrapT: "clamp",
    minFilter: "linear",
    magFilter: "linear",
    flipY: false,
  };

  constructor(gl: GLContext, params: Partial<GLTextureParams> = {}) {
    const handle = gl.createTexture();
    if (!handle) {
      throw new Error("Failed to create texture");
    }

    this.gl = gl;
    this.handle = handle;
    this.update(params);
  }

  get width() {
    return this.params.width;
  }

  get height() {
    return this.params.height;
  }

  bind(unit = 0) {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.handle);
  }

  update(params: Partial<GLTextureParams> = {}) {
    const gl = this.gl;
    const map = glMap(gl);

    this.params = { ...this.params, ...params };

    const minFilter = map.filter[this.params.minFilter];
    const magFilter = map.filter[this.params.magFilter];
    const wrapS = map.wrap[this.params.wrapS];
    const wrapT = map.wrap[this.params.wrapT];
    const format = map.format[this.params.format];
    const type = map.type[this.params.type];
    const data = this.params.data;

    gl.bindTexture(gl.TEXTURE_2D, this.handle);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.params.flipY ? 1 : 0);

    if (data && !ArrayBuffer.isView(data)) {
      gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, data);
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        format,
        this.width,
        this.height,
        0,
        format,
        type,
        data,
      );
    }
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new Error("Texture width and height must be positive");
    }
    if (width === this.width && height === this.height) {
      return;
    }
    this.update({ width, height });
  }

  dispose() {
    this.gl.deleteTexture(this.handle);
  }
}

// Buffers
export type GLBufferData = ArrayBufferView | ArrayLike<number> | null;

export type GLBufferParams = {
  target: keyof GLMap["bufferTarget"];
  usage: keyof GLMap["bufferUsage"];
  data: GLBufferData;
};

export class GLBuffer {
  target: keyof GLMap["bufferTarget"];
  usage: keyof GLMap["bufferUsage"];

  readonly gl: GLContext;
  readonly handle: WebGLBuffer;

  constructor(gl: GLContext, params: Partial<GLBufferParams> = {}) {
    this.gl = gl;
    this.handle = gl.createBuffer();

    this.target = params.target ?? "array";
    this.usage = params.usage ?? "static";

    if (params.data) {
      this.update(params.data);
    }
  }

  private normalizeData(data: GLBufferData): ArrayBufferView | null {
    if (ArrayBuffer.isView(data)) {
      return data;
    }
    if (Array.isArray(data)) {
      return new Float32Array(data);
    }
    return null;
  }

  use(fn: () => void) {
    if (!this.handle) return;
    const targetEnum = glMap(this.gl).bufferTarget[this.target];
    this.gl.bindBuffer(targetEnum, this.handle);
    fn();
    this.gl.bindBuffer(targetEnum, null);
  }

  update(data: GLBufferData) {
    if (!this.handle) return;
    const targetEnum = glMap(this.gl).bufferTarget[this.target];
    const usageEnum = glMap(this.gl).bufferUsage[this.usage];
    const payload = this.normalizeData(data);
    this.use(() => {
      if (payload) {
        this.gl.bufferData(targetEnum, payload, usageEnum);
      } else {
        this.gl.bufferData(targetEnum, 0, usageEnum);
      }
    });
  }

  dispose() {
    this.gl.deleteBuffer(this.handle);
  }
}

export class GLFramebuffer {
  readonly gl: GLContext;
  readonly texture: GLTexture;
  readonly handle: WebGLFramebuffer;

  constructor(gl: GLContext, texture: GLTexture) {
    this.gl = gl;
    this.texture = texture;
    this.handle = gl.createFramebuffer();

    // bind
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture.handle,
      0,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  use(fn: () => void) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.handle);
    this.gl.viewport(0, 0, this.texture.width, this.texture.height);
    fn();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  dispose() {
    this.gl.deleteFramebuffer(this.handle);
    this.texture.dispose();
  }
}

// Program
export type GLBlendConfig = {
  enabled?: boolean;
  srcFactor?: keyof GLMap["blendFactor"];
  dstFactor?: keyof GLMap["blendFactor"];
  equation?: keyof GLMap["blendEquation"];
};

export type GLAttribute = {
  buffer: GLBuffer;
  size: number;
  type?: keyof GLMap["attributeType"];
  normalized?: boolean;
  stride?: number;
  offset?: number;
};

export type GLAttributes<Props = {}> = Record<
  string,
  GLAttribute | ((props: Props) => GLAttribute)
>;

export type GLUniformValue =
  | number
  | boolean
  | readonly number[]
  | Float32Array
  | Int32Array
  | GLTexture;

export type GLUniforms<Props = {}> = Record<
  string,
  GLUniformValue | ((props: Props) => GLUniformValue)
>;

export type GLProgramDefinition<Props extends {} = {}> = {
  vert?: string;
  frag?: string;
  primitive?: keyof GLMap["primitive"];
  count?: number;
  offset?: number;
  indexType?: keyof GLMap["indexType"];
  elements?: GLBuffer;
  attributes?: GLAttributes<Props>;
  uniforms?: GLUniforms<Props>;
  blend?: GLBlendConfig;
};

type GLProgramUniform<Props> = {
  name: string;
  location: WebGLUniformLocation;
  value: GLUniformValue | ((props: Props) => GLUniformValue);
};

type GLProgramAttribute<Props> = {
  name: string;
  location: number;
  value: GLAttribute | ((props: Props) => GLAttribute);
};

export class GLProgram<Props extends {} = {}> {
  readonly gl: GLContext;
  private readonly handle: WebGLProgram;

  private blend: GLBlendConfig = {
    enabled: false,
  };

  private elements?: GLBuffer;
  private primitive: keyof GLMap["primitive"];
  private count: number;
  private offset: number;
  private indexType?: keyof GLMap["indexType"];

  private uniforms: Record<string, GLProgramUniform<Props>> = {};
  private attributes: Record<string, GLProgramAttribute<Props>> = {};
  private attributeCache = new Map<number, GLAttribute>();

  static readonly DEFAULT_VERT = /* glsl */ `
    precision mediump float;
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  static readonly DEFAULT_FRAG = /* glsl */ `
    precision mediump float;
    varying vec2 uv;
    void main() {
      gl_FragColor = vec4(uv, 0.0, 1.0);
    }
  `;

  static createFSQuadBuffer(gl: GLContext) {
    return new GLBuffer(gl, {
      target: "array",
      usage: "static",
      data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    });
  }

  constructor(gl: GLContext, definition: GLProgramDefinition<Props> = {}) {
    this.gl = gl;

    const vert = definition.vert ?? GLProgram.DEFAULT_VERT;
    const frag = definition.frag ?? GLProgram.DEFAULT_FRAG;
    const attributes = definition.attributes ?? {
      position: {
        buffer: GLProgram.createFSQuadBuffer(gl),
        size: 2,
      },
    };

    if (!vert.length || !frag.length) {
      throw new Error("Program requires both vertex and fragment shaders");
    }

    if (definition.blend) {
      this.blend = definition.blend;
    }

    this.elements = definition.elements;
    this.primitive = definition.primitive ?? "triangleStrip";
    this.count = definition.count ?? 4;
    this.offset = definition.offset ?? 0;
    this.indexType = definition.indexType ?? "uint16";

    this.handle = this.buildProgram(gl, vert, frag);

    if (definition.uniforms) {
      this.uniforms = this.buildUniforms(gl, definition.uniforms);
    }

    if (attributes) {
      this.attributes = this.buildAttributes(gl, attributes);
    }
  }

  private buildUniforms(gl: GLContext, uniforms: GLUniforms<Props>) {
    const result: Record<string, GLProgramUniform<Props>> = {};
    for (const [name, value] of Object.entries(uniforms)) {
      const location = gl.getUniformLocation(this.handle, name);
      if (!location) {
        throw new Error(`Uniform not found: ${name}`);
      }
      result[name] = { name, location, value };
    }
    return result;
  }

  private buildAttributes(gl: GLContext, attributes: GLAttributes<Props>) {
    const result: Record<string, GLProgramAttribute<Props>> = {};
    for (const [name, value] of Object.entries(attributes)) {
      const location = gl.getAttribLocation(this.handle, name);
      if (location === -1) {
        throw new Error(`Attribute not found: ${name}`);
      }
      result[name] = { name, location, value };
    }
    return result;
  }

  private compileShader(gl: GLContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Failed to create shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      const log = gl.getShaderInfoLog(shader) ?? "";
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${log}`);
    }

    return shader;
  }

  private buildProgram(gl: GLContext, vertSrc: string, fragSrc: string) {
    const vert = this.compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = this.compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      throw new Error("Failed to create program");
    }

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
      const log = gl.getProgramInfoLog(program) ?? "";
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      throw new Error(`Program link failed: ${log}`);
    }

    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
  }

  private writeUniformArray(
    gl: GLContext,
    location: WebGLUniformLocation,
    value: Float32Array | Int32Array,
  ): void {
    const length = value.length;

    if (value instanceof Int32Array) {
      const intArray = value;
      switch (length) {
        case 1:
          gl.uniform1iv(location, intArray);
          return;
        case 2:
          gl.uniform2iv(location, intArray);
          return;
        case 3:
          gl.uniform3iv(location, intArray);
          return;
        case 4:
          gl.uniform4iv(location, intArray);
          return;
        default:
          throw new Error("Unsupported integer uniform array length");
      }
    }

    const floatArray =
      value instanceof Float32Array ? value : new Float32Array(value);

    switch (length) {
      case 1:
        gl.uniform1fv(location, floatArray);
        return;
      case 2:
        gl.uniform2fv(location, floatArray);
        return;
      case 3:
        gl.uniform3fv(location, floatArray);
        return;
      case 4:
        gl.uniform4fv(location, floatArray);
        return;
      case 9:
        gl.uniformMatrix3fv(location, false, floatArray);
        return;
      case 16:
        gl.uniformMatrix4fv(location, false, floatArray);
        return;
      default:
        throw new Error("Unsupported float uniform array length");
    }
  }

  private writeUniform(
    gl: GLContext,
    location: WebGLUniformLocation,
    value: GLUniformValue,
    textureUnit?: number,
  ) {
    if (textureUnit !== undefined) {
      gl.uniform1i(location, textureUnit);
      return;
    }

    if (typeof value === "number") {
      gl.uniform1f(location, value);
      return;
    }

    if (typeof value === "boolean") {
      gl.uniform1i(location, value ? 1 : 0);
      return;
    }

    if (Array.isArray(value)) {
      this.writeUniformArray(gl, location, new Float32Array(value));
      return;
    }

    if (value instanceof Float32Array || value instanceof Int32Array) {
      this.writeUniformArray(gl, location, value);
      return;
    }

    throw new Error("Unsupported uniform value");
  }

  private applyUniforms(props: Props) {
    const gl = this.gl;

    let textureUnit = 0;
    for (const uniform of Object.values(this.uniforms)) {
      const value =
        typeof uniform.value === "function"
          ? uniform.value(props)
          : uniform.value;

      if (value instanceof GLTexture) {
        value.bind(textureUnit);
        gl.uniform1i(uniform.location, textureUnit);
        textureUnit += 1;
        continue;
      }

      // Write uniform value to shader
      this.writeUniform(gl, uniform.location, value);
    }
  }

  private writeAttribute(
    gl: GLContext,
    location: number,
    attribute: GLAttribute,
  ) {
    if (attribute.buffer.target !== "array") {
      throw new Error("Attribute buffers must use the 'array' target");
    }

    const type = glMap(gl).attributeType[attribute.type ?? "float"] ?? gl.FLOAT;
    const normalized = attribute.normalized ?? false;
    const stride = attribute.stride ?? 0;
    const offset = attribute.offset ?? 0;

    attribute.buffer.use(() => {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        attribute.size,
        type,
        normalized,
        stride,
        offset,
      );
    });
  }

  private applyAttributes(props: Props) {
    const gl = this.gl;
    for (const attribute of Object.values(this.attributes)) {
      const value =
        typeof attribute.value === "function"
          ? attribute.value(props)
          : attribute.value;

      const cached = this.attributeCache.get(attribute.location);

      if (cached === value) {
        continue;
      }

      this.writeAttribute(gl, attribute.location, value);
      this.attributeCache.set(attribute.location, value);
    }
  }

  private applyBlend() {
    if (this.blend?.enabled) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(
        glMap(this.gl).blendFactor[this.blend.srcFactor ?? "one"],
        glMap(this.gl).blendFactor[this.blend.dstFactor ?? "zero"],
      );
      this.gl.blendEquation(
        glMap(this.gl).blendEquation[this.blend.equation ?? "add"],
      );
    } else {
      this.gl.disable(this.gl.BLEND);
    }
  }

  private drawElements(elements: GLBuffer) {
    if (elements.target !== "element") {
      throw new Error("Indexed draws require an element buffer");
    }

    const mode = glMap(this.gl).primitive[this.primitive];
    const type = glMap(this.gl).indexType[this.indexType ?? "uint16"];

    elements.use(() => {
      this.gl.drawElements(mode, this.count ?? 4, type, this.offset ?? 0);
    });
  }

  private drawArrays() {
    const mode = glMap(this.gl).primitive[this.primitive];
    this.gl.drawArrays(mode, this.offset ?? 0, this.count ?? 4);
  }

  use(fn: () => void) {
    const gl = this.gl;
    const previous = gl.getParameter(gl.CURRENT_PROGRAM);
    if (previous === this.handle) {
      fn();
      return;
    }

    gl.useProgram(this.handle);
    try {
      fn();
    } finally {
      gl.useProgram(previous);
    }
  }

  draw(props: Props = {} as Props) {
    this.use(() => {
      this.applyBlend();
      this.applyUniforms(props);
      this.applyAttributes(props);

      if (this.elements) {
        this.drawElements(this.elements);
      } else {
        this.drawArrays();
      }
    });
  }

  dispose() {
    this.gl.deleteProgram(this.handle);
  }
}

// Renderer
export type GLRendererParams = {
  context?: GLContext;
  canvas?: HTMLCanvasElement;
  attributes?: WebGLContextAttributes;
};

export class GLRenderer {
  gl: GLContext;
  programs: WeakMap<GLProgramDefinition, GLProgram>;

  constructor(params: GLRendererParams = {}) {
    const canvas = params.canvas ?? document.createElement("canvas");
    const context =
      params.context ??
      canvas.getContext("webgl2", {
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        depth: false,
        ...params.attributes,
      });

    if (!context) {
      throw new Error("Failed to create WebGL context");
    }

    this.gl = context;
    this.programs = new WeakMap();
  }

  get canvas() {
    return this.gl.canvas as HTMLCanvasElement;
  }

  resize(width: number, height: number) {
    if (this.canvas.width !== width) {
      this.canvas.width = width;
    }
    if (this.canvas.height !== height) {
      this.canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);
  }

  clear(color = [0, 0, 0, 1]) {
    const [r, g, b, a] = color;
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  program<Props extends {} = {}>(definition: GLProgramDefinition<Props>) {
    const cached = this.programs.get(definition as GLProgramDefinition);
    if (cached) {
      return cached;
    }
    const program = new GLProgram(this.gl, definition);
    this.programs.set(definition as GLProgramDefinition, program as GLProgram);
    return program as GLProgram<Props>;
  }

  texture(params: Partial<GLTextureParams> = {}) {
    return new GLTexture(this.gl, params);
  }

  framebuffer(texture?: GLTexture): GLFramebuffer {
    if (!texture) {
      texture = this.texture({
        width: this.canvas.width,
        height: this.canvas.height,
      });
    }
    return new GLFramebuffer(this.gl, texture);
  }

  buffer(params: Partial<GLBufferParams> = {}) {
    return new GLBuffer(this.gl, params);
  }

  dispose() {
    for (const program of Object.values(this.programs)) {
      program.dispose();
    }
    this.programs = new WeakMap();
  }
}
