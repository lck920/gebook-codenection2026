/**
 * Gradient — the animated mesh-gradient effect that renders on top of a
 * {@link MiniGl} plane. It owns the shader pair, the uniform tree, the render
 * loop, and a {@link ResizeObserver} tied to the canvas element (the original
 * listened on `window` and never detached; `dispose()` here cleans everything
 * up).
 */

import {
  Material,
  Mesh,
  MiniGl,
  PlaneGeometry,
  Uniform,
} from "./mini-gl";

export interface GradientDeform {
  incline?: number;
  offsetTop?: number;
  offsetBottom?: number;
  noiseFreq?: [number, number];
  noiseAmp?: number;
  noiseSpeed?: number;
  noiseFlow?: number;
  noiseSeed?: number;
}

export interface GradientOptions {
  /** Two or more hex colours (`#rrggbb`). Index 0 is the base fill. */
  colors: string[];
  /** Strength of the optional top-edge darkening. */
  shadowPower?: number;
  /** Darken the top of the gradient (adds depth on light palettes). */
  darkenTop?: boolean;
  /** Global noise animation speed. */
  noiseSpeed?: number;
  /** Global noise frequency, `[x, y]`. */
  noiseFrequency?: [number, number];
  /** Vertex-deformation tuning for the "wave" shape. */
  deform?: GradientDeform;
}

type ResolvedOptions = Required<Omit<GradientOptions, "deform">> & {
  deform: GradientDeform;
};

const DEFAULTS: Omit<ResolvedOptions, "colors"> = {
  shadowPower: 5,
  darkenTop: false,
  noiseSpeed: 5e-6,
  noiseFrequency: [1.4e-4, 2.9e-4],
  deform: {},
};

/** `0xRRGGBB` → linear `[r, g, b]` in the 0..1 range the shader expects. */
function normalizeColor(hex: number): [number, number, number] {
  const value = Number.isNaN(hex) ? 0 : hex;
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

const VERTEX_SHADER = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

vec3 blendNormal(vec3 base, vec3 blend) { return blend; }
vec3 blendNormal(vec3 base, vec3 blend, float opacity) { return (blend * opacity + base * (1.0 - opacity)); }

varying vec3 v_color;

void main() {
  float time = u_time * u_global.noiseSpeed;
  vec2 noiseCoord = resolution * uvNorm * u_global.noiseFreq;
  float tilt = resolution.y / 2.0 * uvNorm.y;
  float incline = resolution.x * uvNorm.x / 2.0 * u_vertDeform.incline;
  float offset = resolution.x / 2.0 * u_vertDeform.incline * mix(u_vertDeform.offsetBottom, u_vertDeform.offsetTop, uv.y);

  float noise = snoise(vec3(
    noiseCoord.x * u_vertDeform.noiseFreq.x + time * u_vertDeform.noiseFlow,
    noiseCoord.y * u_vertDeform.noiseFreq.y,
    time * u_vertDeform.noiseSpeed + u_vertDeform.noiseSeed
  )) * u_vertDeform.noiseAmp;

  noise *= 1.0 - pow(abs(uvNorm.y), 2.0);
  noise = max(0.0, noise);

  vec3 pos = vec3(position.x, position.y + tilt + incline + noise - offset, position.z);

  v_color = u_baseColor;

  for (int i = 0; i < u_waveLayers_length; i++) {
    if (u_active_colors[i + 1] == 1.) {
      WaveLayers layer = u_waveLayers[i];
      float layerNoise = smoothstep(
        layer.noiseFloor,
        layer.noiseCeil,
        snoise(vec3(
          noiseCoord.x * layer.noiseFreq.x + time * layer.noiseFlow,
          noiseCoord.y * layer.noiseFreq.y,
          time * layer.noiseSpeed + layer.noiseSeed
        )) / 2.0 + 0.5
      );
      v_color = blendNormal(v_color, layer.color, pow(layerNoise, 4.));
    }
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const FRAGMENT_SHADER = `
varying vec3 v_color;

void main() {
  vec3 color = v_color;
  if (u_darken_top == 1.0) {
    vec2 st = gl_FragCoord.xy / resolution.xy;
    color.g -= pow(st.y + sin(-12.0) * st.x, u_shadow_power) * 0.4;
  }
  gl_FragColor = vec4(color, 1.0);
}`;

export class Gradient {
  private readonly miniGl: MiniGl;
  private readonly mesh: Mesh;
  private readonly options: ResolvedOptions;
  private readonly uniforms: Record<string, Uniform>;
  private readonly observer: ResizeObserver;

  private time = 0;
  private lastFrame = 0;
  private frameId: number | null = null;
  private running = false;

  constructor(canvas: HTMLCanvasElement, options: GradientOptions) {
    // Resolve field-by-field: callers routinely pass `noiseFrequency: undefined`
    // etc., and a plain `{ ...DEFAULTS, ...options }` would let that undefined
    // clobber the default.
    this.options = {
      colors: options.colors,
      shadowPower: options.shadowPower ?? DEFAULTS.shadowPower,
      darkenTop: options.darkenTop ?? DEFAULTS.darkenTop,
      noiseSpeed: options.noiseSpeed ?? DEFAULTS.noiseSpeed,
      noiseFrequency: options.noiseFrequency ?? DEFAULTS.noiseFrequency,
      deform: options.deform ?? DEFAULTS.deform,
    };
    this.miniGl = new MiniGl(canvas);
    this.uniforms = this.buildUniforms();
    this.mesh = this.buildMesh();
    this.resize();

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
  }

  /** Start the render loop (idempotent). */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  /** Stop the render loop without tearing anything down. */
  stop(): void {
    this.running = false;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }

  /** Draw a single frame at t=0 — used for `prefers-reduced-motion`. */
  renderStatic(): void {
    this.setTime(0);
    this.miniGl.render();
  }

  /** Detach the observer, stop the loop, and drop the GL context. */
  dispose(): void {
    this.stop();
    this.observer.disconnect();
    this.miniGl.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;
    // Clamp the step so a backgrounded tab doesn't fast-forward the noise.
    this.time += Math.min(now - this.lastFrame, 1000 / 15);
    this.lastFrame = now;
    this.setTime(this.time);
    this.miniGl.render();
    this.frameId = requestAnimationFrame(this.tick);
  };

  private setTime(value: number): void {
    const u = this.uniforms.u_time;
    if (u) u.value = value;
  }

  private resize(): void {
    const { canvas } = this.miniGl;
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);

    this.miniGl.setSize(width, height);
    this.miniGl.setOrthographicCamera();
    this.mesh.geometry.setTopology(
      Math.ceil(width * 0.02),
      Math.ceil(height * 0.05),
    );
    this.mesh.geometry.setSize(width, height);

    const shadow = this.uniforms.u_shadow_power;
    if (shadow) shadow.value = width < 600 ? 5 : this.options.shadowPower;
    this.miniGl.render();
  }

  private buildUniforms(): Record<string, Uniform> {
    const colors = this.options.colors.map((hex) =>
      normalizeColor(Number.parseInt(hex.replace(/^#/, ""), 16)),
    );
    const base = colors[0];
    if (!base) throw new Error("Gradient: `colors` needs at least one entry");

    const d = this.options.deform;
    const globalNoise: Record<string, Uniform> = {
      noiseFreq: new Uniform({
        type: "vec2",
        value: [...this.options.noiseFrequency],
      }),
      noiseSpeed: new Uniform({ value: this.options.noiseSpeed }),
    };
    const vertDeform: Record<string, Uniform> = {
      incline: new Uniform({ value: d.incline ?? 0 }),
      offsetTop: new Uniform({ value: d.offsetTop ?? -0.5 }),
      offsetBottom: new Uniform({ value: d.offsetBottom ?? -0.5 }),
      noiseFreq: new Uniform({
        type: "vec2",
        value: d.noiseFreq ? [...d.noiseFreq] : [3, 4],
      }),
      noiseAmp: new Uniform({ value: d.noiseAmp ?? 320 }),
      noiseSpeed: new Uniform({ value: d.noiseSpeed ?? 10 }),
      noiseFlow: new Uniform({ value: d.noiseFlow ?? 3 }),
      noiseSeed: new Uniform({ value: d.noiseSeed ?? 5 }),
    };

    const waveLayers: Uniform[] = [];
    for (let i = 1; i < colors.length; i++) {
      const layerColor = colors[i];
      if (!layerColor) continue;
      waveLayers.push(
        new Uniform({
          type: "struct",
          value: {
            color: new Uniform({ type: "vec3", value: [...layerColor] }),
            noiseFreq: new Uniform({
              type: "vec2",
              value: [2 + i / colors.length, 3 + i / colors.length],
            }),
            noiseSpeed: new Uniform({ value: 11 + 0.3 * i }),
            noiseFlow: new Uniform({ value: 6.5 + 0.3 * i }),
            noiseSeed: new Uniform({ value: 5 + 10 * i }),
            noiseFloor: new Uniform({ value: 0.1 }),
            noiseCeil: new Uniform({ value: 0.63 + 0.07 * i }),
          },
        }),
      );
    }

    return {
      u_time: new Uniform({ value: 0 }),
      u_shadow_power: new Uniform({ value: this.options.shadowPower }),
      u_darken_top: new Uniform({ value: this.options.darkenTop ? 1 : 0 }),
      u_active_colors: new Uniform({ type: "vec4", value: [1, 1, 1, 1] }),
      u_global: new Uniform({ type: "struct", value: globalNoise }),
      u_vertDeform: new Uniform({
        type: "struct",
        value: vertDeform,
        excludeFrom: "fragment",
      }),
      u_baseColor: new Uniform({
        type: "vec3",
        value: [...base],
        excludeFrom: "fragment",
      }),
      u_waveLayers: new Uniform({
        type: "array",
        value: waveLayers,
        excludeFrom: "fragment",
      }),
    };
  }

  private buildMesh(): Mesh {
    const material = new Material(
      this.miniGl,
      VERTEX_SHADER,
      FRAGMENT_SHADER,
      this.uniforms,
    );
    const geometry = new PlaneGeometry(this.miniGl.gl);
    return new Mesh(this.miniGl, geometry, material);
  }
}
