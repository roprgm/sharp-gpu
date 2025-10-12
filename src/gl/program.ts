import { GLBuffer } from "./buffer";
import { GLTexture } from "./texture";
import { GLContext } from "./renderer";

export type GLAttributeType =
  | "float"
  | "byte"
  | "short"
  | "unsigned-byte"
  | "unsigned-short";

export type GLBlendFactor =
  | "zero"
  | "one"
  | "src-color"
  | "one-minus-src-color"
  | "dst-color"
  | "one-minus-dst-color"
  | "src-alpha"
  | "one-minus-src-alpha"
  | "dst-alpha"
  | "one-minus-dst-alpha";

export type GLBlendEquation = "add" | "subtract" | "reverse-subtract";

export type GLBlendConfig = {
  enabled?: boolean;
  srcFactor?: GLBlendFactor;
  dstFactor?: GLBlendFactor;
  equation?: GLBlendEquation;
};

export type GLDrawPrimitive =
  | "points"
  | "lines"
  | "line-strip"
  | "line-loop"
  | "triangles"
  | "triangle-strip"
  | "triangle-fan";

export type GLIndexType = "uint8" | "uint16" | "uint32";

export type GLAttribute = {
  buffer: GLBuffer;
  size: number;
  type?: GLAttributeType;
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
  primitive?: GLDrawPrimitive;
  count?: number;
  offset?: number;
  indexType?: GLIndexType;
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

function defaultAttributes(gl: GLContext) {
  const buffer = new GLBuffer(gl, {
    target: "array",
    usage: "static",
    data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
  });

  return {
    position: {
      buffer,
      size: 2,
    },
  };
}

const DEFAULT_FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 uv;
  void main() {
    gl_FragColor = vec4(uv, 0.0, 1.0);
  }
`;

const DEFAULT_VERT = /* glsl */ `
  precision mediump float;
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

export class GLProgram<Props extends {} = {}> {
  readonly gl: GLContext;
  private readonly handle: WebGLProgram;

  private blend?: GLBlendConfig;
  private elements?: GLBuffer;
  private primitive: GLDrawPrimitive;
  private count: number;
  private offset: number;
  private indexType?: GLIndexType;

  private uniforms: Record<string, GLProgramUniform<Props>> = {};
  private attributes: Record<string, GLProgramAttribute<Props>> = {};
  private attributeCache = new Map<number, GLAttribute>();

  constructor(
    gl: GLContext,
    {
      vert = DEFAULT_VERT,
      frag = DEFAULT_FRAG,
      primitive = "triangle-strip",
      indexType = "uint16",
      count = 4,
      offset = 0,
      uniforms,
      attributes = defaultAttributes(gl),
      elements,
      blend,
    }: GLProgramDefinition<Props> = {},
  ) {
    this.gl = gl;

    if (!vert.length || !frag.length) {
      throw new Error("Program requires both vertex and fragment shaders");
    }

    this.blend = blend;
    this.elements = elements;
    this.primitive = primitive;
    this.count = count;
    this.offset = offset;
    this.indexType = indexType;

    this.handle = buildProgram(gl, vert, frag);

    if (uniforms) {
      this.uniforms = this.buildUniforms(gl, uniforms);
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

      writeUniform(gl, uniform.location, value);
    }
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

      writeAttribute(gl, attribute.location, value);
      this.attributeCache.set(attribute.location, value);
    }
  }

  private applyBlend() {
    if (this.blend?.enabled) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(
        mapBlendFactor(this.gl, this.blend.srcFactor ?? "one"),
        mapBlendFactor(this.gl, this.blend.dstFactor ?? "zero"),
      );
      this.gl.blendEquation(
        mapBlendEquation(this.gl, this.blend.equation ?? "add"),
      );
    } else {
      this.gl.disable(this.gl.BLEND);
    }
  }

  private drawElements(elements: GLBuffer) {
    if (elements.target !== "element") {
      throw new Error("Indexed draws require an element buffer");
    }
    const type = mapIndexType(this.gl, this.indexType ?? "uint16");
    elements.use(() => {
      this.gl.drawElements(
        mapPrimitive(this.gl, this.primitive),
        this.count ?? 4,
        type,
        this.offset ?? 0,
      );
    });
  }

  private drawArrays() {
    this.gl.drawArrays(
      mapPrimitive(this.gl, this.primitive),
      this.offset ?? 0,
      this.count ?? 4,
    );
  }

  draw(props: Props = {} as Props) {
    const gl = this.gl;

    withProgram(gl, this.handle, () => {
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

function buildProgram(gl: GLContext, vertSrc: string, fragSrc: string) {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);

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

function compileShader(
  gl: GLContext,
  type: number,
  source: string,
): WebGLShader {
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

function getUniformLocation(
  gl: GLContext,
  program: WebGLProgram,
  cache: Map<string, WebGLUniformLocation>,
  name: string,
) {
  const cached = cache.get(name);
  if (cached) {
    return cached;
  }

  const location = gl.getUniformLocation(program, name);
  if (!location) {
    throw new Error(`Uniform not found: ${name}`);
  }
  cache.set(name, location);
  return location;
}

function getAttributeLocation(
  gl: GLContext,
  program: WebGLProgram,
  cache: Map<string, number>,
  name: string,
) {
  const cached = cache.get(name);
  if (typeof cached === "number") {
    return cached;
  }

  const location = gl.getAttribLocation(program, name);
  if (location === -1) {
    throw new Error(`Attribute not found: ${name}`);
  }
  cache.set(name, location);
  return location;
}

function writeUniform(
  gl: GLContext,
  location: WebGLUniformLocation,
  value: GLUniformValue,
  textureUnit?: number,
): void {
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
    writeUniformArray(gl, location, new Float32Array(value));
    return;
  }

  if (value instanceof Float32Array || value instanceof Int32Array) {
    writeUniformArray(gl, location, value);
    return;
  }

  throw new Error("Unsupported uniform value");
}

function writeUniformArray(
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

function writeAttribute(
  gl: GLContext,
  location: number,
  attribute: GLAttribute,
): void {
  if (attribute.buffer.target !== "array") {
    throw new Error("Attribute buffers must use the 'array' target");
  }

  const type = mapAttributeType(gl, attribute.type ?? "float");
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

function withProgram(
  gl: GLContext,
  program: WebGLProgram,
  fn: () => void,
): void {
  const previous = gl.getParameter(gl.CURRENT_PROGRAM);
  if (previous === program) {
    fn();
    return;
  }

  gl.useProgram(program);
  try {
    fn();
  } finally {
    gl.useProgram(previous);
  }
}

function mapAttributeType(gl: GLContext, type: GLAttributeType): number {
  switch (type) {
    case "byte":
      return gl.BYTE;
    case "short":
      return gl.SHORT;
    case "unsigned-byte":
      return gl.UNSIGNED_BYTE;
    case "unsigned-short":
      return gl.UNSIGNED_SHORT;
    default:
      return gl.FLOAT;
  }
}

function mapPrimitive(gl: GLContext, primitive: GLDrawPrimitive): number {
  switch (primitive) {
    case "points":
      return gl.POINTS;
    case "lines":
      return gl.LINES;
    case "line-strip":
      return gl.LINE_STRIP;
    case "line-loop":
      return gl.LINE_LOOP;
    case "triangle-strip":
      return gl.TRIANGLE_STRIP;
    case "triangle-fan":
      return gl.TRIANGLE_FAN;
    default:
      return gl.TRIANGLES;
  }
}

function mapIndexType(gl: GLContext, type: GLIndexType): number {
  switch (type) {
    case "uint8":
      return gl.UNSIGNED_BYTE;
    case "uint32":
      return gl.UNSIGNED_INT;
    default:
      return gl.UNSIGNED_SHORT;
  }
}

function mapBlendFactor(gl: GLContext, factor: GLBlendFactor): number {
  switch (factor) {
    case "zero":
      return gl.ZERO;
    case "one":
      return gl.ONE;
    case "src-color":
      return gl.SRC_COLOR;
    case "one-minus-src-color":
      return gl.ONE_MINUS_SRC_COLOR;
    case "dst-color":
      return gl.DST_COLOR;
    case "one-minus-dst-color":
      return gl.ONE_MINUS_DST_COLOR;
    case "src-alpha":
      return gl.SRC_ALPHA;
    case "one-minus-src-alpha":
      return gl.ONE_MINUS_SRC_ALPHA;
    case "dst-alpha":
      return gl.DST_ALPHA;
    case "one-minus-dst-alpha":
      return gl.ONE_MINUS_DST_ALPHA;
    default:
      return gl.ONE;
  }
}

function mapBlendEquation(gl: GLContext, equation: GLBlendEquation): number {
  switch (equation) {
    case "subtract":
      return gl.FUNC_SUBTRACT;
    case "reverse-subtract":
      return gl.FUNC_REVERSE_SUBTRACT;
    default:
      return gl.FUNC_ADD;
  }
}
