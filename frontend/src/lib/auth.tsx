'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from './api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  suMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, nickname: string) => Promise<void>;
  suUser: (userId: number) => Promise<void>;
  suBack: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [suMode, setSuMode] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/auth/me');
      setUser(res.data.user);
      setSuMode(!!res.data.su_mode);
    } catch {
      setUser(null);
      setSuMode(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/v1/auth/login', { login: email, password });
    setUser(res.data.user);
    setSuMode(false);
  };

  const logout = async () => {
    await api.post('/api/v1/auth/logout');
    setUser(null);
    setSuMode(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dots-theme');
    }
  };

  const register = async (email: string, nickname: string) => {
    await api.post('/api/v1/auth/register', { email, nickname });
  };

  const suUser = async (userId: number) => {
    await api.post(`/api/v1/admin/su/${userId}`);
    await fetchUser();
  };

  const suBack = async () => {
    await api.post('/api/v1/admin/su/back');
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, suMode, login, logout, register, suUser, suBack, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
