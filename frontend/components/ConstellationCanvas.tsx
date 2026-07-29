"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/* ─── Page-Aware Interactive Constellation & Magical Stardust Canvas ─── */
export default function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const isLanding = pathname === "/";

  // Use refs so animation loop always has latest page context without re-init
  const isLandingRef = useRef(isLanding);
  useEffect(() => {
    isLandingRef.current = isLanding;
  }, [isLanding]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mouseX = -1000;
    let mouseY = -1000;
    let wandAngle = 0;

    const trail: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
      life: number;
      maxLife: number;
      isSparkle: boolean;
    }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = [
      "255, 255, 255", // Pure White
      "56, 189, 248",  // Soft Cyan
      "192, 132, 252", // Soft Fuchsia/Purple
      "244, 114, 182", // Pink Gold
    ];

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      const currentLanding = isLandingRef.current;
      const spawnCount = currentLanding ? 2 : 1;
      const initialAlpha = currentLanding ? 0.95 : 0.4;

      for (let i = 0; i < spawnCount; i++) {
        trail.push({
          x: mouseX + (Math.random() - 0.5) * 8,
          y: mouseY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2 - 0.3,
          size: Math.random() * 2.5 + 1,
          alpha: initialAlpha,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: currentLanding ? 28 : 18,
          maxLife: currentLanding ? 28 : 18,
          isSparkle: Math.random() > 0.5,
        });
      }
      if (trail.length > 50) trail.splice(0, trail.length - 50);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const currentLanding = isLandingRef.current;
      const count = currentLanding ? 10 : 6;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 2.5 + 0.8;
        trail.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: Math.random() * 3 + 1.5,
          alpha: 1.0,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 24,
          maxLife: 24,
          isSparkle: true,
        });
      }
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseleave", handleMouseLeave);

    const STAR_COUNT = 85;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 3 + 1.2,
      isSparkle: Math.random() > 0.75,
      alpha: Math.random() * 0.6 + 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      twinkleSpeed: Math.random() * 0.01 + 0.003,
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
      rotation: Math.random() * Math.PI,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
    }));

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      wandAngle += 0.025;
      const currentLanding = isLandingRef.current;

      // 1. Update star positions & twinkling
      for (const s of stars) {
        s.alpha += s.twinkleSpeed * s.twinkleDir;
        if (s.alpha >= 0.9) s.twinkleDir = -1;
        if (s.alpha <= 0.2) s.twinkleDir = 1;

        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0 || s.x > canvas.width) s.vx *= -1;
        if (s.y < 0 || s.y > canvas.height) s.vy *= -1;
      }

      // 2. Draw Constellation Lines between nearby stars
      const maxDistance = currentLanding ? 140 : 125;
      const lineMultiplier = currentLanding ? 0.18 : 0.08;

      for (let i = 0; i < stars.length; i++) {
        const starAlphaI = currentLanding ? stars[i].alpha : stars[i].alpha * 0.55;

        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const starAlphaJ = currentLanding ? stars[j].alpha : stars[j].alpha * 0.55;
            const lineAlpha = (1 - dist / maxDistance) * lineMultiplier * Math.min(starAlphaI, starAlphaJ);
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.strokeStyle = `rgba(129, 140, 248, ${lineAlpha})`;
            ctx.lineWidth = currentLanding ? 0.8 : 0.6;
            ctx.stroke();
          }
        }

        // Connect to mouse if close
        const mdx = stars[i].x - mouseX;
        const mdy = stars[i].y - mouseY;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        const maxMouseDist = currentLanding ? 220 : 180;
        if (mdist < maxMouseDist) {
          const mAlphaFactor = currentLanding ? 0.75 : 0.4;
          const mAlpha = (1 - mdist / maxMouseDist) * mAlphaFactor;
          ctx.save();
          ctx.shadowBlur = currentLanding ? 10 : 5;
          ctx.shadowColor = `rgba(192, 132, 252, ${mAlpha})`;
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(mouseX, mouseY);
          ctx.strokeStyle = `rgba(192, 132, 252, ${mAlpha})`;
          ctx.lineWidth = currentLanding ? 1.8 : 1.3;
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Update & Draw Cursor Stardust Trail
      for (let k = trail.length - 1; k >= 0; k--) {
        const p = trail[k];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = (p.life / p.maxLife) * (currentLanding ? 0.9 : 0.55);

        if (p.life <= 0) {
          trail.splice(k, 1);
          continue;
        }

        ctx.save();
        ctx.shadowBlur = currentLanding ? 8 : 4;
        ctx.shadowColor = `rgba(${p.color}, ${p.alpha})`;

        if (p.isSparkle) {
          ctx.translate(p.x, p.y);
          ctx.rotate(wandAngle * 1.5 + k);
          ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
          ctx.beginPath();
          const sz = p.size * (p.life / p.maxLife);
          for (let b = 0; b < 4; b++) {
            const ang = (b * Math.PI) / 2;
            ctx.lineTo(Math.cos(ang) * sz, Math.sin(ang) * sz);
            ctx.lineTo(Math.cos(ang + Math.PI / 4) * (sz * 0.25), Math.sin(ang + Math.PI / 4) * (sz * 0.25));
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
          ctx.fill();
        }
        ctx.restore();
      }

      // 4. Draw Full Glowing Magic Wand at Cursor Position
      if (mouseX > 0 && mouseY > 0) {
        ctx.save();

        const wandLength = currentLanding ? 24 : 19;
        const angle = Math.PI / 4; // 45 degrees pointing down-right from cursor tip
        const tipX = mouseX;
        const tipY = mouseY;
        const tailX = mouseX + Math.cos(angle) * wandLength;
        const tailY = mouseY + Math.sin(angle) * wandLength;

        // A. Draw Wand Shaft with Gradient Glow
        ctx.save();
        ctx.shadowBlur = currentLanding ? 12 : 7;
        ctx.shadowColor = "rgba(168, 85, 247, 0.75)";

        const grad = ctx.createLinearGradient(tipX, tipY, tailX, tailY);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
        grad.addColorStop(0.2, "rgba(192, 132, 252, 0.9)");
        grad.addColorStop(0.6, "rgba(99, 102, 241, 0.85)");
        grad.addColorStop(1, "rgba(30, 27, 75, 0.75)");

        ctx.beginPath();
        ctx.moveTo(tipX + Math.cos(angle) * 2, tipY + Math.sin(angle) * 2);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = currentLanding ? 2.8 : 2.2;
        ctx.lineCap = "round";
        ctx.stroke();

        // Decorative Gold Ring near tip
        const ringX = tipX + Math.cos(angle) * 4.5;
        const ringY = tipY + Math.sin(angle) * 4.5;
        ctx.beginPath();
        ctx.arc(ringX, ringY, currentLanding ? 1.8 : 1.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
        ctx.fill();
        ctx.restore();

        // B. Draw Pulsing Energy Aura at Wand Tip
        ctx.save();
        ctx.translate(tipX, tipY);

        const pulse = Math.sin(wandAngle * 3) * 0.15 + 0.85;
        ctx.beginPath();
        ctx.arc(0, 0, (currentLanding ? 7.5 : 5.5) * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(192, 132, 252, ${currentLanding ? 0.3 : 0.18})`;
        ctx.fill();

        // C. Draw Rotating 4-Point Crystal Top
        ctx.rotate(wandAngle);
        ctx.shadowBlur = currentLanding ? 16 : 9;
        ctx.shadowColor = "rgba(255, 255, 255, 0.95)";

        ctx.beginPath();
        const starRadius = currentLanding ? 6.2 : 4.6;
        const innerRadius = currentLanding ? 1.4 : 1.0;
        for (let b = 0; b < 4; b++) {
          const ang = (b * Math.PI) / 2;
          ctx.lineTo(Math.cos(ang) * starRadius, Math.sin(ang) * starRadius);
          ctx.lineTo(Math.cos(ang + Math.PI / 4) * innerRadius, Math.sin(ang + Math.PI / 4) * innerRadius);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${currentLanding ? 0.98 : 0.82})`;
        ctx.fill();

        // D. Inner Cyan Core Star
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        const coreRadius = starRadius * 0.45;
        const coreInner = innerRadius * 0.5;
        for (let b = 0; b < 4; b++) {
          const ang = (b * Math.PI) / 2;
          ctx.lineTo(Math.cos(ang) * coreRadius, Math.sin(ang) * coreRadius);
          ctx.lineTo(Math.cos(ang + Math.PI / 4) * coreInner, Math.sin(ang + Math.PI / 4) * coreInner);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(56, 189, 248, 0.95)";
        ctx.fill();

        ctx.restore();
        ctx.restore();
      }

      // 5. Draw Stars & Node Sparkles
      for (const s of stars) {
        const effectiveAlpha = currentLanding ? s.alpha : s.alpha * 0.55; // 55% opacity on app pages

        if (s.isSparkle) {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rotation);

          ctx.shadowBlur = currentLanding ? s.size * 3 : s.size * 1.5;
          ctx.shadowColor = `rgba(${s.color}, ${effectiveAlpha})`;
          ctx.fillStyle = `rgba(${s.color}, ${effectiveAlpha})`;

          ctx.beginPath();
          const outer = currentLanding ? s.size : s.size * 0.85;
          const inner = outer * 0.18;
          for (let k = 0; k < 4; k++) {
            const angle = (k * Math.PI) / 2;
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            ctx.lineTo(Math.cos(angle + Math.PI / 4) * inner, Math.sin(angle + Math.PI / 4) * inner);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          ctx.shadowBlur = currentLanding && s.size > 2.5 ? 5 : 2;
          ctx.shadowColor = `rgba(${s.color}, ${effectiveAlpha})`;

          ctx.beginPath();
          ctx.arc(s.x, s.y, (currentLanding ? s.size : s.size * 0.85) * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.color}, ${effectiveAlpha})`;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}
