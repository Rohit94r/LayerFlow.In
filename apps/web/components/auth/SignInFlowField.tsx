"use client";

import { useEffect, useRef } from "react";

/**
 * Full-screen canvas background for /sign-in.
 * Curved streams fan out from the left edge and converge toward a focal
 * point on the right — where the auth card sits — with glow particles
 * drifting along each path (LangSmith-style "flow into the card").
 *
 * Theme-aware (reads html.light) and honors prefers-reduced-motion by
 * rendering a single static frame instead of animating.
 */

type Curve = {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  alpha: number;
};

type Particle = {
  curve: number;
  t: number;
  speed: number;
  size: number;
  hue: number; // 0 teal, 1 blue, 2 amber
};

const CURVE_COUNT = 26;
const PARTICLE_COUNT = 70;

function pointOnCurve(c: Curve, t: number): [number, number] {
  const u = 1 - t;
  const x = u * u * c.x0 + 2 * u * t * c.cx + t * t * c.x1;
  const y = u * u * c.y0 + 2 * u * t * c.cy + t * t * c.y1;
  return [x, y];
}

export default function SignInFlowField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let curves: Curve[] = [];
    let particles: Particle[] = [];
    let raf = 0;
    let lastTime = 0;
    let isLight = document.documentElement.classList.contains("light");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const build = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Focal point: right of center on desktop (under the auth card),
      // center on narrow screens (card stacks on top).
      const wide = width >= 1024;
      const fx = wide ? width * 0.72 : width * 0.5;
      const fy = wide ? height * 0.48 : height * 0.42;

      curves = [];
      for (let i = 0; i < CURVE_COUNT; i++) {
        const r = i / (CURVE_COUNT - 1);
        // Starts spread along the left edge plus a few from top/bottom edges.
        const fromEdge = i % 5 === 0;
        const x0 = fromEdge ? width * (0.05 + Math.random() * 0.25) : -20;
        const y0 = fromEdge
          ? (i % 2 === 0 ? -20 : height + 20)
          : height * (0.04 + 0.92 * r) + (Math.random() - 0.5) * 30;
        // Control point bends streams into a horizontal "beam" mid-screen.
        const cx = width * (0.28 + Math.random() * 0.18);
        const cy = fy + (y0 - fy) * (0.18 + Math.random() * 0.2);
        const x1 = fx + (Math.random() - 0.5) * 60;
        const y1 = fy + (Math.random() - 0.5) * 90;
        curves.push({ x0, y0, cx, cy, x1, y1, alpha: 0.35 + Math.random() * 0.65 });
      }

      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          curve: i % CURVE_COUNT,
          t: Math.random(),
          speed: 0.05 + Math.random() * 0.11, // full path in ~9–20s
          size: 0.8 + Math.random() * 1.7,
          hue: i % 7 === 0 ? 2 : i % 2, // mostly teal/blue, occasional amber
        });
      }
    };

    const strokeColor = (a: number) =>
      isLight ? `rgba(11, 11, 20, ${0.055 * a})` : `rgba(160, 210, 230, ${0.07 * a})`;

    const dotColor = (hue: number, a: number) => {
      const dim = isLight ? 0.75 : 1;
      if (hue === 2) return `rgba(245, 158, 11, ${a * dim})`;
      if (hue === 1) return `rgba(96, 165, 250, ${a * dim})`;
      return `rgba(68, 237, 188, ${a * dim})`;
    };

    const drawFrame = (dt: number) => {
      ctx.clearRect(0, 0, width, height);

      for (const c of curves) {
        ctx.beginPath();
        ctx.moveTo(c.x0, c.y0);
        ctx.quadraticCurveTo(c.cx, c.cy, c.x1, c.y1);
        ctx.strokeStyle = strokeColor(c.alpha);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Soft glow where the streams converge (behind the auth card).
      const [gx, gy] = [curves[0]?.x1 ?? width * 0.72, curves[0]?.y1 ?? height * 0.48];
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(width, height) * 0.35);
      glow.addColorStop(0, isLight ? "rgba(68, 237, 188, 0.05)" : "rgba(68, 237, 188, 0.06)");
      glow.addColorStop(1, "rgba(68, 237, 188, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      for (const p of particles) {
        if (dt > 0) {
          p.t += p.speed * dt;
          if (p.t >= 1) {
            p.t = 0;
            p.curve = Math.floor(Math.random() * curves.length);
          }
        }
        const c = curves[p.curve];
        if (!c) continue;
        const [x, y] = pointOnCurve(c, p.t);
        // Brighten as the particle approaches the card, fade at both ends.
        const fade = Math.sin(Math.PI * Math.min(p.t * 1.15, 1)) * (0.35 + 0.65 * p.t);

        const halo = ctx.createRadialGradient(x, y, 0, x, y, p.size * 5);
        halo.addColorStop(0, dotColor(p.hue, 0.22 * fade));
        halo.addColorStop(1, dotColor(p.hue, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dotColor(p.hue, 0.9 * fade);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (time: number) => {
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      drawFrame(dt);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      lastTime = 0;
      if (reducedMotion.matches) {
        drawFrame(0); // static frame only
      } else {
        raf = requestAnimationFrame(loop);
      }
    };

    build();
    start();

    const onResize = () => {
      build();
      if (reducedMotion.matches) drawFrame(0);
    };
    window.addEventListener("resize", onResize);
    reducedMotion.addEventListener("change", start);

    const themeObserver = new MutationObserver(() => {
      isLight = document.documentElement.classList.contains("light");
      if (reducedMotion.matches) drawFrame(0);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      reducedMotion.removeEventListener("change", start);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
