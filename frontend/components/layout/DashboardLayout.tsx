"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  Upload,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  Compass,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Manuscripts", href: "/manuscripts", icon: BookOpen },
    { name: "Upload New", href: "/upload", icon: Upload },
    { name: "Editorial Reports", href: "/reports", icon: FileText },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* ── Desktop Sidebar ────────────────────────────────────────── */}
      <aside className={`hidden md:flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-md shrink-0 transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
        {/* Brand / Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <BookOpen className="w-4 h-4 text-white/95" />
              <div className="absolute -bottom-0.5 -right-0.5 bg-slate-950 rounded-md p-0.5 border border-slate-800">
                <Search className="w-2.5 h-2.5 text-indigo-400" />
              </div>
            </div>
            {!collapsed && (
              <span className="font-semibold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
                InkSpector
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 px-3.5 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={`flex items-center rounded-xl text-sm font-medium transition-all duration-200 group ${
                  collapsed ? "justify-center p-2.5 hover:scale-105" : "gap-3 px-3.5 py-2.5 hover:translate-x-1"
                } ${
                  Active
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/20 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                {/* Active/Hover Icon Gradient Highlight */}
                <div className={`p-1.5 rounded-lg transition-colors ${
                  Active 
                    ? "bg-white/10 text-white" 
                    : "bg-transparent text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400"
                }`}>
                  <item.icon className="w-4 h-4" />
                </div>
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/20 flex flex-col items-center">
          <div className={`flex items-center gap-3 mb-4 px-1.5 w-full ${collapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-semibold text-white uppercase shrink-0">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-200">{user?.full_name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            className={`flex items-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-200 w-full ${
              collapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2"
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ──────────────────────────────────────────── */}
      <header className="md:hidden h-16 flex items-center justify-between px-6 bg-slate-900/60 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
            <BookOpen className="w-4 h-4 text-white/95" />
            <div className="absolute -bottom-0.5 -right-0.5 bg-slate-950 rounded-md p-0.5 border border-slate-800">
              <Search className="w-2.5 h-2.5 text-indigo-400" />
            </div>
          </div>
          <span className="font-semibold text-slate-200">InkSpector</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-4/5 max-w-sm bg-slate-900 border-r border-slate-800 h-full p-6 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-8">
              <span className="font-bold text-lg bg-gradient-to-r from-slate-100 to-indigo-300 bg-clip-text text-transparent">
                InkSpector
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {navigation.map((item) => {
                const Active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                      Active
                        ? "bg-indigo-600/10 border-l-2 border-indigo-500 text-indigo-400"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-6 border-t border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 uppercase">
                  {user?.full_name?.charAt(0) || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{user?.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Area ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
