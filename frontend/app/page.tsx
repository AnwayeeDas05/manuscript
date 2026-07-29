"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Sparkles, Cpu, ChevronRight, PenTool, Search, Shield } from "lucide-react";


/* ─── Sections ───────────────────────────────────────────────────────── */
const SECTIONS = ["hero", "features"] as const;
type Section = (typeof SECTIONS)[number];

export default function LandingPage() {
  const [active, setActive] = useState<Section>("hero");
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transitionTo = (next: Section) => {
    if (next === active) return;
    setVisible(false);
    setTimeout(() => {
      setActive(next);
      setVisible(true);
    }, 400); // fade-out duration
  };

  // Auto-advance every 6 s
  useEffect(() => {
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        const nextIdx = (SECTIONS.indexOf(active) + 1) % SECTIONS.length;
        transitionTo(SECTIONS[nextIdx]);
      }, 6000);
    };
    schedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative overflow-hidden">

      {/* ── Navbar ────────────────────────────────────────────────────── */}
      <nav className="h-20 max-w-7xl mx-auto w-full flex items-center justify-between px-6 sticky top-0 bg-slate-950/70 backdrop-blur-md z-50 border-b border-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <BookOpen className="w-4 h-4 text-white/95" />
            <div className="absolute -bottom-0.5 -right-0.5 bg-slate-950 rounded-md p-0.5 border border-slate-800">
              <Search className="w-3 h-3 text-indigo-400" />
            </div>
          </div>
          <span className="font-extrabold tracking-wider text-lg">
            <span className="text-fuchsia-500">INK</span>
            <span className="text-cyan-400">SPECTOR</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-xl text-white shadow-lg shadow-indigo-600/25 transition-all duration-300 hover:-translate-y-0.5"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Animated Content Area ─────────────────────────────────────── */}
      <div className="flex-1 relative z-10">
        {/* Hero */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 transition-all duration-500 ease-in-out"
          style={{
            opacity: active === "hero" && visible ? 1 : 0,
            transform: active === "hero" && visible ? "translateY(0)" : "translateY(20px)",
            pointerEvents: active === "hero" ? "auto" : "none",
          }}
        >
          {/* Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[140px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-semibold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Editorial Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold max-w-4xl tracking-tight leading-none mb-6">
            Automate the Initial Review of{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
              Fiction Manuscripts
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed mb-10">
            Upload your manuscript in PDF or DOCX format. Coordinate specialist AI agents powered by
            LangGraph and Gemini to scan for character consistency, plot holes, timeline sequence issues,
            and dialogue quality in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 py-4 rounded-xl shadow-xl shadow-indigo-600/25 transition-all hover:-translate-y-0.5"
            >
              Start Your Review <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Features */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-500 ease-in-out"
          style={{
            opacity: active === "features" && visible ? 1 : 0,
            transform: active === "features" && visible ? "translateY(0)" : "translateY(20px)",
            pointerEvents: active === "features" ? "auto" : "none",
          }}
        >
          <div className="max-w-5xl w-full">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Coordinate Multi-Agent AI Workflows</h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
                Your manuscript is evaluated by specialized reviewer agents, guided by a Chief Editor
                synthesizing professional feedback.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-5">
              {[
                { icon: Sparkles, bg: "bg-blue-500/10", text: "text-blue-400", title: "Character Agent", desc: "Detects personality contradictions, missing introductions, and name variations across chapters." },
                { icon: PenTool, bg: "bg-purple-500/10", text: "text-purple-400", title: "Plot Agent", desc: "Examines narrative pacing, uncovers plot holes, weak scenes, and incomplete story arcs." },
                { icon: Cpu, bg: "bg-amber-500/10", text: "text-amber-400", title: "Timeline Agent", desc: "Ensures chronological consistency, validating sequences, age consistency, and date tags." },
                { icon: BookOpen, bg: "bg-emerald-500/10", text: "text-emerald-400", title: "Dialogue Agent", desc: "Assesses quality, character voice authenticity, repetition, and natural phrasing rhythms." },
              ].map(({ icon: Icon, bg, text, title, desc }) => (
                <div
                  key={title}
                  className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700/60 transition-colors backdrop-blur-sm"
                >
                  <div className={`w-10 h-10 rounded-xl ${bg} ${text} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section Dots ─────────────────────────────────────────────── */}
      <div className="relative z-20 flex justify-center gap-2 pb-8">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => transitionTo(s)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              active === s ? "bg-indigo-400 w-6" : "bg-slate-600 hover:bg-slate-500"
            }`}
            aria-label={`Go to ${s} section`}
          />
        ))}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-20 border-t border-slate-900 bg-slate-950/80 py-8 text-center text-xs text-slate-500 px-6">
        <p>© {new Date().getFullYear()} <span className="text-fuchsia-500 font-bold">INK</span><span className="text-cyan-400 font-bold">SPECTOR</span> Platform. All rights reserved.</p>
        <p className="mt-2 text-slate-600">Built using Next.js, FastAPI, LangGraph, and Google Gemini API.</p>
      </footer>
    </div>
  );
}
