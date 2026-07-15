"use client";

import React from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../components/AuthContext";
import { formatDate } from "../../lib/utils";
import { User, Mail, Shield, Calendar, Award, LogOut, Key } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-2xl mx-auto w-full space-y-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Account Profile</h1>
          <p className="text-slate-400 text-sm">
            View your authentication details and system roles.
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-950/5 to-slate-900/30 border border-slate-800/80 border-l-4 border-l-indigo-500 rounded-2xl overflow-hidden shadow-xl hover-lift animate-fade-in">
          {/* Header Accent */}
          <div className="h-28 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 relative">
            <div className="absolute -bottom-10 left-8">
              <div className="w-20 h-20 rounded-2xl bg-indigo-600 border-4 border-slate-950 flex items-center justify-center font-black text-2xl text-white uppercase shadow-lg">
                {user?.full_name?.charAt(0) || "U"}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="pt-14 p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100">{user?.full_name}</h2>
              <p className="text-xs text-indigo-400 font-semibold">@{user?.username}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 border-t border-slate-800/80 pt-6">
              <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-900 rounded-xl hover-lift">
                <Mail className="w-4 h-4 text-slate-500" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Email</p>
                  <p className="text-xs text-slate-200 truncate">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-900 rounded-xl hover-lift">
                <Calendar className="w-4 h-4 text-slate-500" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Member Since</p>
                  <p className="text-xs text-slate-200">
                    {user?.created_at ? formatDate(user.created_at).split(",")[0] : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-900 rounded-xl hover-lift">
                <Shield className="w-4 h-4 text-slate-500" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Account Status</p>
                  <p className="text-xs text-emerald-400 font-semibold">
                    {user?.is_active ? "Active" : "Suspended"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-900 rounded-xl hover-lift">
                <Key className="w-4 h-4 text-slate-500" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Role</p>
                  <p className="text-xs text-slate-350">Author / Reviewer</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/85">
              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-semibold py-3 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out of Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
