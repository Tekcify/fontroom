(() => {
const LINE_VERTEX = `#version 300 es
precision highp float;
in vec2 aPoint;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uFrame;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 uMouse;
uniform float uCount;
uniform float uThickness;
uniform float uSoftness;
uniform float uWaves;
uniform float uSplit;
uniform float uFray;
uniform float uSeed;
uniform vec2 uTurn;
uniform vec4 uPart;
uniform float uTaper;
out float vEdge;
out float vBand;
out float vDraw;
out float vAlpha;
out float vIndex;

float Perlin2D(vec2 P) {
  vec2 Pi = floor(P);
  vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
  vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
  Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
  Pt += vec2(26.0, 161.0).xyxy;
  Pt *= Pt;
  Pt = Pt.xzxz * Pt.yyww;
  vec4 hash_x = fract(Pt * (1.0 / 951.135664));
  vec4 hash_y = fract(Pt * (1.0 / 642.949883));
  vec4 grad_x = hash_x - 0.49999;
  vec4 grad_y = hash_y - 0.49999;
  vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y) * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
  grad_results *= 1.4142135623730950;
  vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
  vec4 blend2 = vec4(blend, vec2(1.0 - blend));
  return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

void main() {
  float perc = float(gl_InstanceID) / uCount;
  float x = aPoint.x;
  float pixel = 1.0 / max(uResolution.x, uResolution.y);
  float splitPoint = uSplit + perc * uFray;
  float amplitudeNormal = smoothstep(splitPoint, max(0.7, splitPoint + 0.2), x);
  float finalAmplitude = amplitudeNormal * 0.5 * uAmplitude * (1.0 + (uMouse.y - 0.5) * 0.2);
  float timeScaled = uTime / 10.0 + (uMouse.x - 0.5);
  float blur = smoothstep(splitPoint, splitPoint + 0.05, x) * perc;
  float xnoise = mix(
    Perlin2D(vec2(timeScaled * 2.5 + uSeed, (x * uWaves + perc) * 2.5)),
    Perlin2D(vec2(timeScaled * 3.5 + uSeed, (x * uWaves + timeScaled) * 3.5)) / 1.5,
    x * 0.3
  );
  float y = 0.5 + (perc - 0.5) * uDistance + xnoise / 2.0 * finalAmplitude;
  vec2 local = vec2((x - 0.5) * uFrame.x, (y - 0.5) * uFrame.y);
  if (uPart.z > 0.0) {
    vec2 delta = local - uPart.xy;
    float reach = uPart.w;
    float pull = exp(-dot(delta, delta) / (reach * reach));
    local.y += delta.y * pull * uPart.z;
  }
  float width = 7.0 * uThickness * pixel * (1.0 - perc);
  float band = (width / 2.0 + 10.0 * uSoftness * pixel * blur) * uFrame.y;
  float draw = max(band, 1.0);
  local.y += aPoint.y * draw;
  vec2 turned = vec2(local.x * uTurn.x - local.y * uTurn.y, local.x * uTurn.y + local.y * uTurn.x);
  gl_Position = vec4(turned / (uResolution * 0.5), 0.0, 1.0);
  vEdge = aPoint.y * draw;
  vBand = band;
  vDraw = draw;
  vAlpha = 1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3)) * uTaper;
  vIndex = perc;
}`;

const LINE_FRAGMENT = `#version 300 es
precision highp float;
in float vEdge;
in float vBand;
in float vDraw;
in float vAlpha;
in float vIndex;
uniform vec3 uColor;
uniform vec3 uAccent;
out vec4 outColor;
void main() {
  float coverage = (1.0 - smoothstep(0.0, vDraw, abs(vEdge))) * (vBand / vDraw) * vAlpha;
  outColor = vec4(mix(uColor, uAccent, vIndex) * coverage, coverage);
}`;

const SCREEN_VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const SCREEN_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uLines;
uniform vec2 uResolution;
uniform float uFade;
uniform float uOpacity;
uniform float uCurve;
out vec4 outColor;

float smootherstep(float edge, float x) {
  float t = clamp(x / edge, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec4 lines = texture(uLines, vUv);
  float alpha = lines.a;
  vec3 color = alpha > 0.0001 ? lines.rgb / alpha : vec3(0.0);
  float mask = uOpacity;
  if (uFade > 0.0) {
    vec2 px = vUv * uResolution;
    float edge = uFade * min(uResolution.x, uResolution.y) * 0.5;
    mask *= smootherstep(edge, px.x) * smootherstep(edge, uResolution.x - px.x);
    mask *= smootherstep(edge, px.y) * smootherstep(edge, uResolution.y - px.y);
  }
  outColor = vec4(color * pow(alpha, uCurve), alpha) * mask;
}`;

const MAX_RENDER_DIM = 1920;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = (gl, vs, fs) => {
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  const p = gl.createProgram();
  if (!v || !f || !p) return null;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (gl.getProgramParameter(p, gl.LINK_STATUS)) return p;
  gl.deleteProgram(p);
  return null;
};

const locate = (gl, p, names) => Object.fromEntries(names.map(n => [n, gl.getUniformLocation(p, n)]));

function Threads(container, options = {}) {
  const s = Object.assign({
    color: [1, 1, 1],
    accent: null,
    amplitude: 1.7,
    distance: 0.4,
    mouse: false,
    lineCount: 90,
    thickness: 0.6,
    softness: 1.3,
    speed: 0.6,
    waves: 1.05,
    split: 0.04,
    fray: 0.5,
    angle: 25,
    seed: 0,
    parting: 0,
    taper: 0.85,
    brightness: 1.4,
    fade: 0,
    opacity: 1
  }, options);
  s.lineCount = clamp(Math.round(s.lineCount), 1, 400);

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;display:block;width:100%;height:100%";
  const gl = canvas.getContext && canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  const lineProgram = link(gl, LINE_VERTEX, LINE_FRAGMENT);
  const screenProgram = link(gl, SCREEN_VERTEX, SCREEN_FRAGMENT);
  if (!lineProgram || !screenProgram) return null;
  container.appendChild(canvas);

  const lu = locate(gl, lineProgram, ["uTime", "uResolution", "uFrame", "uAmplitude", "uDistance", "uMouse", "uCount", "uThickness", "uSoftness", "uWaves", "uSplit", "uFray", "uSeed", "uTurn", "uPart", "uTaper", "uColor", "uAccent"]);
  const su = locate(gl, screenProgram, ["uLines", "uResolution", "uFade", "uOpacity", "uCurve"]);

  const lineVao = gl.createVertexArray();
  const lineBuffer = gl.createBuffer();
  gl.bindVertexArray(lineVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  const pointLoc = gl.getAttribLocation(lineProgram, "aPoint");
  gl.enableVertexAttribArray(pointLoc);
  gl.vertexAttribPointer(pointLoc, 2, gl.FLOAT, false, 0, 0);

  const screenVao = gl.createVertexArray();
  const screenBuffer = gl.createBuffer();
  gl.bindVertexArray(screenVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, screenBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(screenProgram, "aPosition");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const target = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D, target);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  const color = s.color;
  const accent = s.accent || s.color;
  const st = { time: s.seed * 7, width: 1, height: 1, segments: 0, mouse: [0.5, 0.5], targetMouse: [0.5, 0.5], pointer: [0, 0], targetPointer: [0, 0], presence: 0, inside: false };
  let raf = 0, last = 0, visible = true, alive = true;

  const buildStrip = segments => {
    if (segments === st.segments) return;
    st.segments = segments;
    const pts = new Float32Array((segments + 1) * 4);
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      pts.set([u, -1, u, 1], i * 4);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
  };

  const render = () => {
    const w = canvas.width, h = canvas.height;
    const rad = (s.angle * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const length = Math.abs(w * cos) + Math.abs(h * sin);
    const across = Math.abs(w * sin) + Math.abs(h * cos);
    const scale = w / st.width;
    const mouse = s.mouse ? st.mouse : [0.5, 0.5];
    const strength = s.parting * st.presence * 2;
    const px = st.pointer[0] * scale, py = st.pointer[1] * scale;
    const local = [px * cos + py * sin, -px * sin + py * cos];

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(lineProgram);
    gl.uniform1f(lu.uTime, st.time);
    gl.uniform2f(lu.uResolution, w, h);
    gl.uniform2f(lu.uFrame, length, across);
    gl.uniform1f(lu.uAmplitude, s.amplitude);
    gl.uniform1f(lu.uDistance, s.distance);
    gl.uniform2f(lu.uMouse, mouse[0], mouse[1]);
    gl.uniform1f(lu.uCount, s.lineCount);
    gl.uniform1f(lu.uThickness, s.thickness);
    gl.uniform1f(lu.uSoftness, s.softness);
    gl.uniform1f(lu.uWaves, s.waves);
    gl.uniform1f(lu.uSplit, s.split);
    gl.uniform1f(lu.uFray, s.fray);
    gl.uniform1f(lu.uSeed, s.seed * 13.37);
    gl.uniform2f(lu.uTurn, cos, sin);
    gl.uniform4f(lu.uPart, local[0], local[1], strength, Math.min(w, h) * 0.16);
    gl.uniform1f(lu.uTaper, s.taper);
    gl.uniform3f(lu.uColor, color[0], color[1], color[2]);
    gl.uniform3f(lu.uAccent, accent[0], accent[1], accent[2]);
    gl.bindVertexArray(lineVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (st.segments + 1) * 2, s.lineCount);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(screenProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.uniform1i(su.uLines, 0);
    gl.uniform2f(su.uResolution, w, h);
    gl.uniform1f(su.uFade, s.fade);
    gl.uniform1f(su.uOpacity, s.opacity);
    gl.uniform1f(su.uCurve, 2 / clamp(s.brightness, 0.25, 2));
    gl.bindVertexArray(screenVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  };

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const baseDpr = Math.min(window.devicePixelRatio || 1, 2);
    const longest = Math.max(width, height) * baseDpr;
    const dpr = longest > MAX_RENDER_DIM ? (baseDpr * MAX_RENDER_DIM) / longest : baseDpr;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    st.width = width;
    st.height = height;
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    buildStrip(clamp(Math.round(width / 3), 96, 640));
    render();
  };

  const frame = now => {
    raf = 0;
    if (!alive || !visible || document.hidden) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    const moving = !reduce;
    if (moving) st.time += dt * s.speed;
    const follow = 1 - Math.exp(-dt * 3);
    st.mouse[0] += (st.targetMouse[0] - st.mouse[0]) * follow;
    st.mouse[1] += (st.targetMouse[1] - st.mouse[1]) * follow;
    const glide = 1 - Math.exp(-dt * 10);
    st.pointer[0] += (st.targetPointer[0] - st.pointer[0]) * glide;
    st.pointer[1] += (st.targetPointer[1] - st.pointer[1]) * glide;
    const want = st.inside && s.parting > 0 ? 1 : 0;
    st.presence += (want - st.presence) * (1 - Math.exp(-dt * 4));
    render();
    const settling = Math.abs(st.targetMouse[0] - st.mouse[0]) > 0.0005 || Math.abs(st.targetMouse[1] - st.mouse[1]) > 0.0005 ||
      Math.abs(st.targetPointer[0] - st.pointer[0]) > 0.05 || Math.abs(st.targetPointer[1] - st.pointer[1]) > 0.05 ||
      Math.abs(want - st.presence) > 0.002;
    if (moving || settling) raf = requestAnimationFrame(frame);
    else last = 0;
  };

  const wake = () => {
    if (!raf && alive && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const onMove = e => {
    const r = container.getBoundingClientRect();
    const x = (e.clientX - r.left) / Math.max(1, r.width);
    const y = (e.clientY - r.top) / Math.max(1, r.height);
    const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    if (inside) {
      st.targetMouse = [x, 1 - y];
      st.targetPointer = [e.clientX - r.left - r.width / 2, r.height / 2 - (e.clientY - r.top)];
      if (!st.inside && st.presence < 0.01) st.pointer = [...st.targetPointer];
    } else if (st.inside) {
      st.targetMouse = [0.5, 0.5];
    }
    st.inside = inside;
    wake();
  };
  const onLeave = () => { st.inside = false; st.targetMouse = [0.5, 0.5]; wake(); };
  const onVisibility = () => { last = 0; wake(); };

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  const io = new IntersectionObserver(entries => {
    visible = entries.some(en => en.isIntersecting);
    if (visible) { last = 0; wake(); }
  });
  io.observe(container);
  if (s.mouse || s.parting > 0) {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
  }
  document.addEventListener("visibilitychange", onVisibility);
  resize();
  wake();
  requestAnimationFrame(() => container.classList.add("is-ready"));

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.remove();
    }
  };
}

window.Threads = Threads;
})();
