import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;

  vec3 color = vec3(0.014, 0.015, 0.023);

  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float ph = fi * 1.616;
    vec2 pos = vec2(
      0.5 + 0.42 * sin(uTime * 0.16 + ph),
      0.5 + 0.42 * cos(uTime * 0.14 + ph * 1.3)
    );
    float radius = 0.46 + 0.12 * sin(uTime * 0.2 + fi * 2.3);
    vec2 d = (uv - pos) * vec2(aspect, 1.0) / radius;
    float glow = exp(-dot(d, d) * 1.7);

    vec3 c;
    if (i == 0) c = vec3(0.45, 0.45, 1.0);
    else if (i == 1) c = vec3(0.55, 0.30, 0.96);
    else if (i == 2) c = vec3(0.16, 0.70, 0.95);
    else if (i == 3) c = vec3(0.70, 0.35, 0.85);
    else c = vec3(0.35, 0.50, 0.95);

    color += glow * c * 0.22;
  }

  float grain = hash21(vUv * uRes);
  color += (grain - 0.5) * 0.02;

  vec2 q = uv - 0.5;
  float vig = 1.0 - 0.45 * dot(q, q);
  color *= vig;

  color = pow(color, vec3(1.05));
  gl_FragColor = vec4(color, 1.0);
}
`;

export default function BackgroundCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl;
    try {
      gl = canvas.getContext("webgl", { antialias: true }) || canvas.getContext("experimental-webgl");
    } catch {
      return;
    }
    if (!gl) return;

    function compile(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

    gl.useProgram(prog);

    const posLoc = gl.getAttribLocation(prog, "aPos");
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(prog, "uRes");
    const timeLoc = gl.getUniformLocation(prog, "uTime");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function draw(now) {
      const t = reduceMotion ? 0 : now / 1000;
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now) {
      draw(now);
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      draw(0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !reduceMotion) {
        raf = requestAnimationFrame(frame);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteBuffer(buf);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(prog);
    };
  }, []);

  return <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />;
}