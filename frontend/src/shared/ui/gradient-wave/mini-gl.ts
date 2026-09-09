/**
 * MiniGl — a small, typed WebGL scene helper.
 *
 * A trimmed port of the plumbing behind the "stripe-style" animated mesh
 * gradient: just enough of a scene graph (one plane, one shader program, a
 * reflective uniform system that can emit its own GLSL declarations) to drive
 * {@link ./gradient.Gradient}. It is intentionally dependency-free and is not a
 * general-purpose renderer.
 *
 * The original implementation nested every class inside the constructor as a
 * closure over the GL context and used `any` throughout. Here the classes are
 * module-scoped and the GL context is threaded in explicitly, so the whole
 * thing type-checks under `strict` + `noUncheckedIndexedAccess`.
 */

export type UniformKind =
  | "float"
  | "int"
  | "vec2"
  | "vec3"
  | "vec4"
  | "mat4"
  | "array"
  | "struct";

export type ShaderStage = "vertex" | "fragment";

/**
 * A uniform's value is one of: a scalar, a numeric vector/matrix, a list of
 * nested uniforms (`array`), or a named map of nested uniforms (`struct`).
 */
export type UniformValue =
  | number
  | number[]
  | Uniform[]
  | Record<string, Uniform>;

interface UniformInit {
  value: UniformValue;
  type?: UniformKind;
  /** Skip emitting this uniform's declaration into the given shader stage. */
  excludeFrom?: ShaderStage;
  transpose?: boolean;
}

export class Uniform {
  type: UniformKind;
  value: UniformValue;
  excludeFrom?: ShaderStage;
  transpose: boolean;

  constructor(init: UniformInit) {
    this.type = init.type ?? "float";
    this.value = init.value;
    this.excludeFrom = init.excludeFrom;
    this.transpose = init.transpose ?? false;
  }

  /** Push the current value to a resolved uniform location. */
  update(gl: WebGLRenderingContext, location: WebGLUniformLocation | null): void {
    if (location === null) return;
    switch (this.type) {
      case "float":
        gl.uniform1f(location, this.value as number);
        break;
      case "int":
        gl.uniform1i(location, this.value as number);
        break;
      case "vec2":
        gl.uniform2fv(location, this.value as number[]);
        break;
      case "vec3":
        gl.uniform3fv(location, this.value as number[]);
        break;
      case "vec4":
        gl.uniform4fv(location, this.value as number[]);
        break;
      case "mat4":
        gl.uniformMatrix4fv(location, this.transpose, this.value as number[]);
        break;
    }
  }

  /** Emit the GLSL `uniform ...;` line(s) for this uniform. */
  getDeclaration(name: string, stage: ShaderStage, length?: number): string {
    if (this.excludeFrom === stage) return "";

    if (this.type === "array") {
      const items = this.value as Uniform[];
      const head = items[0];
      if (!head) return "";
      return `${head.getDeclaration(name, stage, items.length)}\nconst int ${name}_length = ${items.length};`;
    }

    if (this.type === "struct") {
      const struct = this.value as Record<string, Uniform>;
      const bare = name.replace(/^u_/, "");
      const typeName = bare.charAt(0).toUpperCase() + bare.slice(1);
      const fields = Object.entries(struct)
        .map(([fieldName, uniform]) =>
          uniform.getDeclaration(fieldName, stage).replace(/^uniform/, ""),
        )
        .join("");
      return `uniform struct ${typeName} {\n${fields}\n} ${name}${length ? `[${length}]` : ""};`;
    }

    return `uniform ${this.type} ${name}${length ? `[${length}]` : ""};`;
  }
}

interface AttributeInit {
  target: number;
  size: number;
  type?: number;
  normalized?: boolean;
}

export class Attribute {
  target: number;
  size: number;
  type: number;
  normalized: boolean;
  buffer: WebGLBuffer;
  values?: Float32Array | Uint16Array;

  constructor(gl: WebGLRenderingContext, init: AttributeInit) {
    this.target = init.target;
    this.size = init.size;
    this.type = init.type ?? gl.FLOAT;
    this.normalized = init.normalized ?? false;
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("MiniGl: could not allocate a buffer");
    this.buffer = buffer;
  }

  update(gl: WebGLRenderingContext): void {
    if (!this.values) return;
    gl.bindBuffer(this.target, this.buffer);
    gl.bufferData(this.target, this.values, gl.STATIC_DRAW);
  }

  attach(gl: WebGLRenderingContext, name: string, program: WebGLProgram): number {
    const location = gl.getAttribLocation(program, name);
    if (this.target === gl.ARRAY_BUFFER) {
      gl.bindBuffer(this.target, this.buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, this.size, this.type, this.normalized, 0, 0);
    }
    return location;
  }

  use(gl: WebGLRenderingContext, location: number): void {
    gl.bindBuffer(this.target, this.buffer);
    if (this.target === gl.ARRAY_BUFFER) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, this.size, this.type, this.normalized, 0, 0);
    }
  }
}

function joinDeclarations(
  uniforms: Record<string, Uniform>,
  stage: ShaderStage,
): string {
  return Object.entries(uniforms)
    .map(([name, uniform]) => uniform.getDeclaration(name, stage))
    .join("\n");
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("MiniGl: could not create a shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown error";
    gl.deleteShader(shader);
    throw new Error(`MiniGl: shader compile failed — ${log}`);
  }
  return shader;
}

export class Material {
  private readonly gl: WebGLRenderingContext;
  uniforms: Record<string, Uniform>;
  uniformInstances: Array<{
    uniform: Uniform;
    location: WebGLUniformLocation | null;
  }> = [];
  program: WebGLProgram;

  constructor(
    miniGl: MiniGl,
    vertexShader: string,
    fragmentShader: string,
    uniforms: Record<string, Uniform>,
  ) {
    const gl = miniGl.gl;
    this.gl = gl;
    this.uniforms = uniforms;

    const prefix = "precision highp float;";
    const vertexSource = [
      prefix,
      "attribute vec4 position;",
      "attribute vec2 uv;",
      "attribute vec2 uvNorm;",
      joinDeclarations(miniGl.commonUniforms, "vertex"),
      joinDeclarations(uniforms, "vertex"),
      vertexShader,
    ].join("\n");
    const fragmentSource = [
      prefix,
      joinDeclarations(miniGl.commonUniforms, "fragment"),
      joinDeclarations(uniforms, "fragment"),
      fragmentShader,
    ].join("\n");

    const program = gl.createProgram();
    if (!program) throw new Error("MiniGl: could not create a program");
    this.program = program;
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "unknown error";
      throw new Error(`MiniGl: program link failed — ${log}`);
    }

    gl.useProgram(program);
    this.registerAll(miniGl.commonUniforms);
    this.registerAll(this.uniforms);
  }

  private registerAll(uniforms: Record<string, Uniform>): void {
    Object.entries(uniforms).forEach(([name, uniform]) =>
      this.register(name, uniform),
    );
  }

  private register(name: string, uniform: Uniform): void {
    if (uniform.type === "array") {
      (uniform.value as Uniform[]).forEach((child, i) =>
        this.register(`${name}[${i}]`, child),
      );
    } else if (uniform.type === "struct") {
      Object.entries(uniform.value as Record<string, Uniform>).forEach(
        ([childName, child]) => this.register(`${name}.${childName}`, child),
      );
    } else {
      this.uniformInstances.push({
        uniform,
        location: this.gl.getUniformLocation(this.program, name),
      });
    }
  }
}

interface PlaneAttributes {
  position: Attribute;
  uv: Attribute;
  uvNorm: Attribute;
  index: Attribute;
}

export class PlaneGeometry {
  private readonly gl: WebGLRenderingContext;
  attributes: PlaneAttributes;
  width = 1;
  height = 1;
  vertexCount = 0;
  xSegCount = 0;
  ySegCount = 0;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.attributes = {
      position: new Attribute(gl, { target: gl.ARRAY_BUFFER, size: 3 }),
      uv: new Attribute(gl, { target: gl.ARRAY_BUFFER, size: 2 }),
      uvNorm: new Attribute(gl, { target: gl.ARRAY_BUFFER, size: 2 }),
      index: new Attribute(gl, {
        target: gl.ELEMENT_ARRAY_BUFFER,
        size: 3,
        type: gl.UNSIGNED_SHORT,
      }),
    };
  }

  setTopology(xSegCount: number, ySegCount: number): void {
    this.xSegCount = Math.max(xSegCount, 1);
    this.ySegCount = Math.max(ySegCount, 1);
    this.vertexCount = (this.xSegCount + 1) * (this.ySegCount + 1);
    const quadCount = this.xSegCount * this.ySegCount * 2;

    const uv = new Float32Array(2 * this.vertexCount);
    const uvNorm = new Float32Array(2 * this.vertexCount);
    const index = new Uint16Array(3 * quadCount);

    for (let y = 0; y <= this.ySegCount; y++) {
      for (let x = 0; x <= this.xSegCount; x++) {
        const i = y * (this.xSegCount + 1) + x;
        uv[2 * i] = x / this.xSegCount;
        uv[2 * i + 1] = 1 - y / this.ySegCount;
        uvNorm[2 * i] = (x / this.xSegCount) * 2 - 1;
        uvNorm[2 * i + 1] = 1 - (y / this.ySegCount) * 2;

        if (x < this.xSegCount && y < this.ySegCount) {
          const s = y * this.xSegCount + x;
          index[6 * s] = i;
          index[6 * s + 1] = i + 1 + this.xSegCount;
          index[6 * s + 2] = i + 1;
          index[6 * s + 3] = i + 1;
          index[6 * s + 4] = i + 1 + this.xSegCount;
          index[6 * s + 5] = i + 2 + this.xSegCount;
        }
      }
    }

    this.attributes.uv.values = uv;
    this.attributes.uvNorm.values = uvNorm;
    this.attributes.index.values = index;
    this.attributes.uv.update(this.gl);
    this.attributes.uvNorm.update(this.gl);
    this.attributes.index.update(this.gl);
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const position = new Float32Array(3 * this.vertexCount);

    const offsetX = width / -2;
    const offsetY = height / -2;
    const segWidth = width / this.xSegCount;
    const segHeight = height / this.ySegCount;

    for (let y = 0; y <= this.ySegCount; y++) {
      const posY = offsetY + y * segHeight;
      for (let x = 0; x <= this.xSegCount; x++) {
        const posX = offsetX + x * segWidth;
        const i = y * (this.xSegCount + 1) + x;
        position[3 * i] = posX;
        position[3 * i + 1] = -posY;
        position[3 * i + 2] = 0;
      }
    }

    this.attributes.position.values = position;
    this.attributes.position.update(this.gl);
  }
}

export class Mesh {
  private readonly gl: WebGLRenderingContext;
  geometry: PlaneGeometry;
  material: Material;
  private readonly attributeInstances: Array<{
    attribute: Attribute;
    location: number;
  }> = [];

  constructor(miniGl: MiniGl, geometry: PlaneGeometry, material: Material) {
    this.gl = miniGl.gl;
    this.geometry = geometry;
    this.material = material;

    (Object.entries(geometry.attributes) as Array<[string, Attribute]>).forEach(
      ([name, attribute]) => {
        this.attributeInstances.push({
          attribute,
          location: attribute.attach(this.gl, name, material.program),
        });
      },
    );

    miniGl.meshes.push(this);
  }

  draw(): void {
    this.gl.useProgram(this.material.program);
    this.material.uniformInstances.forEach(({ uniform, location }) =>
      uniform.update(this.gl, location),
    );
    this.attributeInstances.forEach(({ attribute, location }) =>
      attribute.use(this.gl, location),
    );
    const indices = this.geometry.attributes.index.values;
    this.gl.drawElements(
      this.gl.TRIANGLES,
      indices?.length ?? 0,
      this.gl.UNSIGNED_SHORT,
      0,
    );
  }
}

interface CommonUniforms extends Record<string, Uniform> {
  projectionMatrix: Uniform;
  modelViewMatrix: Uniform;
  resolution: Uniform;
  aspectRatio: Uniform;
}

const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export class MiniGl {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGLRenderingContext;
  readonly meshes: Mesh[] = [];
  readonly commonUniforms: CommonUniforms;
  width = 1;
  height = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) throw new Error("MiniGl: WebGL is not supported in this browser");
    this.gl = gl;

    this.commonUniforms = {
      projectionMatrix: new Uniform({ type: "mat4", value: [...IDENTITY_MATRIX] }),
      modelViewMatrix: new Uniform({ type: "mat4", value: [...IDENTITY_MATRIX] }),
      resolution: new Uniform({ type: "vec2", value: [1, 1] }),
      aspectRatio: new Uniform({ type: "float", value: 1 }),
    };
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    this.commonUniforms.resolution.value = [width, height];
    this.commonUniforms.aspectRatio.value = width / height;
  }

  setOrthographicCamera(): void {
    this.commonUniforms.projectionMatrix.value = [
      2 / this.width, 0, 0, 0,
      0, 2 / this.height, 0, 0,
      0, 0, -0.001, 0,
      0, 0, 0, 1,
    ];
  }

  render(): void {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clearDepth(1);
    this.meshes.forEach((mesh) => mesh.draw());
  }
}
