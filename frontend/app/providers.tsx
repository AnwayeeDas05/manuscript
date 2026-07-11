"use client";

import React from "react";
import { AuthProvider } from "../components/AuthContext";
import { ToastProvider } from "../components/Toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
