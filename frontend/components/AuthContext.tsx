"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken, saveToken, clearToken } from "../lib/auth";
import { usersApi } from "../lib/api";
import { User } from "../lib/types";

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ["/", "/login", "/register"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async (authToken: string) => {
    try {
      const userData = await usersApi.me(authToken);
      setUser(userData);
    } catch (err) {
      console.error("Failed to load user info:", err);
      // If loading me fails, token might be invalid/expired
      clearToken();
      setTokenState(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    async function initAuth() {
      const savedToken = getToken();
      if (savedToken) {
        setTokenState(savedToken);
        await refreshUser(savedToken);
      }
      setLoading(false);
    }
    initAuth();
  }, [refreshUser]);

  useEffect(() => {
    if (!loading) {
      const isPublic = PUBLIC_PATHS.includes(pathname || "");
      if (!token && !isPublic) {
        router.push("/login");
      } else if (token && (pathname === "/login" || pathname === "/register")) {
        router.push("/dashboard");
      }
    }
  }, [token, loading, pathname, router]);

  const login = async (newToken: string) => {
    setLoading(true);
    saveToken(newToken);
    setTokenState(newToken);
    await refreshUser(newToken);
    setLoading(false);
    router.push("/dashboard");
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
    router.push("/login");
  };

  const handleRefreshUser = async () => {
    if (token) {
      await refreshUser(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
        refreshUser: handleRefreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
