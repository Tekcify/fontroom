(() => {
  const PIXEL_BUDGET = 2.4e6;
  const MAX_PULSES = 4;

  const ORIGINS = {
    "top-left": { anchor: [0, -0.2], dir: [0, 1] },
    "top-center": { anchor: [0.5, -0.2], dir: [0, 1] },
    "top-right": { anchor: [1, -0.2], dir: [0, 1] },
    left: { anchor: [-0.2, 0.5], dir: [1, 0] },
    right: { anchor: [1.2, 0.5], dir: [-1, 0] },
    "bottom-left": { anchor: [0, 1.2], dir: [0, -1] },
    "bottom-center": { anchor: [0.5, 1.2], dir: [0, -1] },
    "bottom-right": { anchor: [1, 1.2], dir: [0, -1] }
  };

  const VERTEX = `#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`;

  const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uScale;
uniform float uTime;
uniform vec2 uSource;
uniform vec2 uAim;
uniform float uReach;
uniform vec3 uColor;
uniform float uSpread;
uniform float uLength;
uniform float uFade;
uniform float uSaturation;
uniform float uPulsating;
uniform float uNoise;
uniform float uDistortion;
uniform float uDensity;
uniform float uSharpness;
uniform float uGlow;
uniform float uHaze;
uniform float uAtmosphere;
uniform float uIntensity;
uniform vec4 uShadow;
uniform vec4 uPulses[${MAX_PULSES}];
uniform vec2 uIntro;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}

float shape(float strength, float width) {
  float edge = max(mix(0.5, 0.08, uSharpness), width);
  return mix(strength, smoothstep(0.62 - edge, 0.62 + edge, strength), uSharpness);
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
  vec2 delta = coord - uSource;
  float distance = length(delta);
  vec2 dir = delta / max(distance, 1e-4);
  float cosAngle = dot(dir, uAim);
  float angle = cosAngle + uDistortion * sin(uTime * 2.0 + distance * 0.02) * 0.2;
  float slope = fwidth(angle);
  float depth = distance / uReach;

  float source = exp(-depth * depth * 9.0) * 0.9 + exp(-depth * 3.2) * 0.25;
  float glowLight = uGlow * source * smoothstep(-0.2, 0.6, cosAngle);
  float spread = pow(max(angle, 0.0), 1.0 / uSpread);
  float lengthFalloff = clamp(1.0 - distance / (uReach * uLength), 0.0, 1.0);
  float fadeFalloff = clamp(1.0 - distance / (uReach * uFade), 0.5, 1.0);
  float envelope = spread * lengthFalloff * fadeFalloff;
  float reveal = uIntensity * uIntro.y * (1.0 - smoothstep(uIntro.x - 0.35, uIntro.x, depth));
  if ((envelope * 1.6 + glowLight) * reveal < 0.0015) {
    fragColor = vec4(0.0);
    return;
  }

  float phaseA = angle * 36.2214 * uDensity + uTime * 1.5;
  float phaseB = -angle * 21.11349 * uDensity + uTime * 1.5;
  float phaseC = angle * 22.3991 * uDensity + uTime * 1.1;
  float phaseD = -angle * 18.0234 * uDensity + uTime * 1.1;
  float strengthA = clamp(0.75 + 0.15 * sin(phaseA) + 0.2 * cos(phaseB), 0.0, 1.0);
  float strengthB = clamp(0.75 + 0.15 * sin(phaseC) + 0.2 * cos(phaseD), 0.0, 1.0);
  float widthA = abs(0.15 * 36.2214 * cos(phaseA) + 0.2 * 21.11349 * sin(phaseB)) * uDensity * slope;
  float widthB = abs(0.15 * 22.3991 * cos(phaseC) + 0.2 * 18.0234 * sin(phaseD)) * uDensity * slope;
  float pulseA = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 4.5) : 1.0;
  float pulseB = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 3.3) : 1.0;
  float rayLight = envelope * (0.5 * shape(strengthA, widthA) * pulseA + 0.4 * shape(strengthB, widthB) * pulseB);

  if (uHaze > 0.0) {
    float around = atan(uAim.x * dir.y - uAim.y * dir.x, cosAngle);
    vec2 drift = vec2(around * 2.2 + uTime * 0.035, depth * 2.6 - uTime * 0.11);
    float fog = 0.65 * valueNoise(drift * vec2(3.0, 1.0)) + 0.35 * valueNoise(drift * vec2(7.0, 2.3) + 4.1);
    rayLight *= mix(1.0, 0.25 + 1.2 * fog, uHaze);
  }

  if (uShadow.z > 0.0) {
    vec2 toCursor = uShadow.xy - uSource;
    float cursorDistance = length(toCursor);
    float along = dot(delta, toCursor) / max(cursorDistance * cursorDistance, 1e-4);
    float side = abs(delta.x * toCursor.y - delta.y * toCursor.x) / max(cursorDistance, 1e-4);
    float trail = max(along - 1.0, 0.0);
    float width = uShadow.w * along + 0.22 * trail * cursorDistance;
    float behind = smoothstep(0.97, 1.25, along) * exp(-trail * 1.1);
    float shade = (1.0 - smoothstep(width * 0.3, width * 1.6, side)) * behind;
    rayLight *= 1.0 - uShadow.z * 0.62 * shade;
  }

  float boost = 0.0;
  for (int i = 0; i < ${MAX_PULSES}; i++) {
    vec4 wave = uPulses[i];
    if (wave.z <= 0.0) continue;
    float x = (depth - wave.x) / wave.y;
    boost += wave.z * exp(-x * x);
  }
  float light = (rayLight * (1.0 + boost) + glowLight) * reveal;

  if (uNoise > 0.0) {
    float n = fract(sin(dot(coord * 0.02 + uTime * 0.1, vec2(12.9898, 78.233))) * 43758.5453123);
    light *= 1.0 - uNoise + uNoise * n;
  }

  float near = clamp(1.2 - distance / (uResolution.y / uScale), 0.0, 1.0);
  vec3 tint = mix(vec3(0.9), vec3(0.1, 0.3, 0.5) + near * vec3(0.8, 0.6, 0.5), uAtmosphere);
  float gray = dot(tint, vec3(0.299, 0.587, 0.114));
  vec3 hue = max(mix(vec3(gray), tint, uSaturation), 0.0) * uColor;

  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uLight > 0.5) {
    vec3 color = hue * light;
    float energy = max(color.r, max(color.g, color.b));
    vec3 tone = clamp(1.0 - (1.0 - hue / max(max(hue.r, max(hue.g, hue.b)), 1e-4)) * 1.8, 0.0, 1.0);
    float warm = clamp((min(tone.r, tone.g) - tone.b) * 2.0, 0.0, 1.0);
    vec3 ink = tone * (mix(0.66, 0.94, warm) - 0.1 * smoothstep(0.4, 1.2, energy));
    float density = clamp(0.82 * (1.0 - exp(-1.5 * energy * energy)) * uOpacity + grain, 0.0, 1.0);
    fragColor = vec4(ink * density, density);
    return;
  }
  float level = light < 0.75 ? light : 0.75 + 0.25 * (1.0 - exp(-(light - 0.75) / 0.25));
  float top = max(hue.r, max(hue.g, hue.b));
  hue = mix(hue, vec3(top), smoothstep(0.8, 1.0, level) * 0.45);
  vec3 shown = clamp(hue * level, 0.0, 1.0) * level;
  fragColor = vec4(clamp(shown + grain, 0.0, level) * uOpacity, level * uOpacity);
}`;


  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smoother = t => {
    const x = clamp(t, 0, 1);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  const parseColor = value => {
    const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value || "").trim());
    if (!hex) return null;
    const full = hex[1].length === 3 ? hex[1].replace(/./g, d => d + d) : hex[1];
    return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
  };
  const compile = (gl, type, src) => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { gl.deleteShader(sh); return null; }
    return sh;
  };
  const link = gl => {
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = vs && fs ? gl.createProgram() : null;
    if (!program) { if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs); return null; }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  };

  const DEFAULTS = {
    origin: "top-center", color: "#ffffff", speed: 1, spread: 0.5, length: 3, density: 1, tilt: 0,
    sharpness: 0.35, glow: 0.6, haze: 0.25, atmosphere: 1, intensity: 1, pulsating: false, fade: 1,
    saturation: 1, follow: true, influence: 0.1, cursorShadow: true, clickPulse: false, noise: 0,
    distortion: 0, intro: true, light: false, opacity: 1, maxRatio: 2
  };

  window.LightRays = function (container, options) {
    if (!container || typeof window.WebGL2RenderingContext === "undefined") return null;
    const o = Object.assign({}, DEFAULTS, options || {});
    const s = {
      origin: ORIGINS[o.origin] || ORIGINS["top-center"],
      color: parseColor(o.color) || [1, 1, 1],
      speed: Math.max(0, o.speed),
      spread: Math.max(0.001, o.spread),
      length: Math.max(0.01, o.length),
      density: clamp(o.density, 0.1, 6),
      tilt: (clamp(o.tilt, -90, 90) * Math.PI) / 180,
      sharpness: clamp(o.sharpness, 0, 1),
      glow: Math.max(0, o.glow),
      haze: clamp(o.haze, 0, 1),
      atmosphere: clamp(o.atmosphere, 0, 1),
      intensity: Math.max(0, o.intensity),
      pulsating: !!o.pulsating,
      fade: Math.max(0.01, o.fade),
      saturation: Math.max(0, o.saturation),
      follow: !!o.follow,
      influence: clamp(o.influence, 0, 1),
      cursorShadow: !!o.cursorShadow,
      clickPulse: !!o.clickPulse,
      noise: clamp(o.noise, 0, 1),
      distortion: o.distortion,
      light: !!o.light,
      opacity: clamp(o.opacity, 0, 1),
      maxRatio: clamp(o.maxRatio, 0.5, 3)
    };

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    let gl = null;
    try {
      gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" });
    } catch (e) { gl = null; }
    const shader = gl ? link(gl) : null;
    if (!gl || !shader) return null;
    container.appendChild(canvas);

    const mq = q => (window.matchMedia ? window.matchMedia(q).matches : false);
    const reduced = mq("(prefers-reduced-motion: reduce)");
    const vao = gl.createVertexArray();
    const size = { width: 1, height: 1, ratio: 1 };
    const pointer = { x: 0.5, y: 0.5, inside: false, seen: false };
    const aim = { x: 0.5, y: 0.5 };
    const shade = { x: 0.5, y: 0.5, presence: 0 };
    const pulses = [];
    const pulseData = new Float32Array(MAX_PULSES * 4);
    let time = 0;
    let opening = o.intro && !reduced ? 0 : 1;
    let raf = 0, last = 0, visible = true, lost = false, resizePending = true, readied = false;
    let pageVisible = document.visibilityState !== "hidden";

    const applyResize = () => {
      const rect = container.getBoundingClientRect();
      const cw = Math.max(1, rect.width), ch = Math.max(1, rect.height);
      const detail = s.density * (0.35 + 0.65 * s.sharpness);
      const sampling = Math.max(clamp(0.35 + 0.3 * detail, 0.5, 2), s.noise > 0 ? 1 : 0);
      const ratio = Math.min(window.devicePixelRatio || 1, s.maxRatio, sampling, Math.sqrt(PIXEL_BUDGET / (cw * ch)));
      const w = Math.max(1, Math.round(cw * ratio)), h = Math.max(1, Math.round(ch * ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      size.width = cw; size.height = ch; size.ratio = w / cw;
    };

    const frame = now => {
      raf = 0;
      if (resizePending) { resizePending = false; applyResize(); }
      if (lost) return;
      const dt = clamp((now - last) / 1000 || 0, 0, 0.05);
      last = Math.max(last, now);
      time += dt * s.speed * (reduced ? 0 : 1);
      if (opening < 1) opening = Math.min(1, opening + dt / 1.8);

      const steer = 1 - Math.exp(-dt / 0.2);
      const aimX = s.follow && pointer.seen ? pointer.x : 0.5;
      const aimY = s.follow && pointer.seen ? pointer.y : 0.5;
      aim.x += (aimX - aim.x) * steer;
      aim.y += (aimY - aim.y) * steer;
      const glide = 1 - Math.exp(-dt / 0.08);
      shade.x += (pointer.x - shade.x) * glide;
      shade.y += (pointer.y - shade.y) * glide;
      const shading = pointer.inside && s.cursorShadow && !reduced;
      shade.presence += ((shading ? 1 : 0) - shade.presence) * (1 - Math.exp(-dt / (shading ? 0.25 : 0.5)));

      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].age += dt;
        if (pulses[i].age >= 2) pulses.splice(i, 1);
      }
      pulseData.fill(0);
      pulses.forEach((p, i) => {
        const t = p.age;
        pulseData[i * 4] = 0.05 + t * 1.05;
        pulseData[i * 4 + 1] = 0.14 + t * 0.14;
        pulseData[i * 4 + 2] = 0.9 * smoother(t / 0.15) * (1 - smoother(t / 2));
      });

      const w = size.width, h = size.height;
      const sx = s.origin.anchor[0] * w, sy = s.origin.anchor[1] * h;
      const cos = Math.cos(s.tilt), sin = Math.sin(s.tilt);
      let dx = s.origin.dir[0] * cos - s.origin.dir[1] * sin;
      let dy = s.origin.dir[0] * sin + s.origin.dir[1] * cos;
      if (s.follow && s.influence > 0) {
        const mx = aim.x * w - sx, my = aim.y * h - sy;
        const ml = Math.hypot(mx, my) || 1;
        const bx = dx + (mx / ml - dx) * s.influence, by = dy + (my / ml - dy) * s.influence;
        const bl = Math.hypot(bx, by) || 1;
        dx = bx / bl; dy = by / bl;
      }
      const eased = 1 - Math.pow(1 - opening, 3);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(shader.program);
      gl.bindVertexArray(vao);
      const u = shader.uniforms;
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform1f(u.uScale, size.ratio);
      gl.uniform1f(u.uTime, time);
      gl.uniform2f(u.uSource, sx, sy);
      gl.uniform2f(u.uAim, dx, dy);
      gl.uniform1f(u.uReach, Math.max(w, h));
      gl.uniform3f(u.uColor, s.color[0], s.color[1], s.color[2]);
      gl.uniform1f(u.uSpread, s.spread);
      gl.uniform1f(u.uLength, s.length);
      gl.uniform1f(u.uFade, s.fade);
      gl.uniform1f(u.uSaturation, s.saturation);
      gl.uniform1f(u.uPulsating, s.pulsating ? 1 : 0);
      gl.uniform1f(u.uNoise, s.noise);
      gl.uniform1f(u.uDistortion, s.distortion);
      gl.uniform1f(u.uDensity, s.density);
      gl.uniform1f(u.uSharpness, s.sharpness);
      gl.uniform1f(u.uGlow, s.glow);
      gl.uniform1f(u.uHaze, s.haze);
      gl.uniform1f(u.uAtmosphere, s.atmosphere);
      gl.uniform1f(u.uIntensity, s.intensity);
      gl.uniform4f(u.uShadow, shade.x * w, shade.y * h, shade.presence, 16);
      gl.uniform4fv(u.uPulses, pulseData);
      gl.uniform2f(u.uIntro, eased * 2.6, smoother(opening / 0.5));
      gl.uniform1f(u.uLight, s.light ? 1 : 0);
      gl.uniform1f(u.uOpacity, s.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!readied) { readied = true; container.classList.add("is-ready"); }

      const settling =
        Math.abs(aim.x - aimX) > 1e-4 || Math.abs(aim.y - aimY) > 1e-4 ||
        (shade.presence > 1e-3 && Math.abs(shade.x - pointer.x) + Math.abs(shade.y - pointer.y) > 1e-4) ||
        Math.abs((shading ? 1 : 0) - shade.presence) > 1e-3 || pulses.length > 0;
      const busy = (s.speed > 0 && !reduced) || opening < 1 || settling;
      if (busy && visible && pageVisible) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || lost || !visible || !pageVisible) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const resize = () => { resizePending = true; wake(); };

    const locate = e => {
      const r = container.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / Math.max(1, r.width),
        y: (e.clientY - r.top) / Math.max(1, r.height),
        inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      };
    };
    const onMove = e => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const p = locate(e);
      if (!pointer.inside && p.inside) { shade.x = p.x; shade.y = p.y; }
      pointer.x = p.x; pointer.y = p.y; pointer.inside = p.inside; pointer.seen = true;
      wake();
    };
    const onDown = e => {
      if (!s.clickPulse || reduced || !locate(e).inside) return;
      pulses.push({ age: 0 });
      if (pulses.length > MAX_PULSES) pulses.shift();
      wake();
    };
    const onLeave = () => { pointer.inside = false; wake(); };
    const onVisibility = () => { pageVisible = document.visibilityState !== "hidden"; wake(); };
    const onLost = e => { e.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("webglcontextlost", onLost);

    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(container); else window.addEventListener("resize", resize);
    const io = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => { visible = entries.some(en => en.isIntersecting); wake(); }) : null;
    if (io) io.observe(container);

    wake();

    return {
      destroy() {
        cancelAnimationFrame(raf);
        lost = true;
        if (ro) ro.disconnect(); else window.removeEventListener("resize", resize);
        if (io) io.disconnect();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("webglcontextlost", onLost);
        if (!gl.isContextLost()) { gl.deleteVertexArray(vao); gl.deleteProgram(shader.program); }
        canvas.remove();
      }
    };
  };
})();
