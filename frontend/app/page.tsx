import Link from "next/link";
import { BookOpen, Sparkles, Shield, Cpu, ChevronRight, PenTool, Search } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
      {/* ── Header / Navbar ────────────────────────────────────────── */}
      <nav className="h-20 max-w-7xl mx-auto w-full flex items-center justify-between px-6 border-b border-slate-900/60 sticky top-0 bg-slate-950/70 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <BookOpen className="w-4.5 h-4.5 text-white/95" />
            <div className="absolute -bottom-0.5 -right-0.5 bg-slate-950 rounded-md p-0.5 border border-slate-800">
              <Search className="w-3 h-3 text-indigo-400" />
            </div>
          </div>
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            InkSpector
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
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

      {/* ── Hero Section ──────────────────────────────────────────── */}
      <header className="max-w-7xl mx-auto w-full px-6 py-20 lg:py-32 flex flex-col items-center text-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

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

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-sm">
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 py-4 rounded-xl shadow-xl shadow-indigo-600/25 transition-all hover:-translate-y-0.5"
          >
            Start Your Review <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── Features Grid ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto w-full px-6 py-16 border-t border-slate-900/60">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Coordinate Multi-Agent AI Workflows</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Your manuscript is evaluated by specialized reviewer agents, guided by a Chief Editor
            synthesizing professional feedback.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden hover:border-slate-700/60 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Character Agent</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Detects personality contradictions, missing introductions, and name variations across chapters.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden hover:border-slate-700/60 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <PenTool className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Plot Agent</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Examines narrative pacing, uncovers plot holes, weak scenes, and incomplete story arcs.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden hover:border-slate-700/60 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Timeline Agent</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ensures chronological consistency, validating sequences, age consistency, and date tags.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden hover:border-slate-700/60 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Dialogue Agent</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Assesses quality, character voice authenticity, repetition, and natural phrasing rhythms.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 text-center text-xs text-slate-500 px-6">
        <p>© {new Date().getFullYear()} InkSpector Platform. All rights reserved.</p>
        <p className="mt-2 text-slate-600">Built using Next.js, FastAPI, LangGraph, and Google Gemini API.</p>
      </footer>
    </div>
  );
}
