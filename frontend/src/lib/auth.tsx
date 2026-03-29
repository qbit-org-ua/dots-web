'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from './api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, nickname: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
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
  };

  const logout = async () => {
    await api.post('/api/v1/auth/logout');
    setUser(null);
  };

  const register = async (email: string, nickname: string) => {
    await api.post('/api/v1/auth/register', { email, nickname });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, refetch: fetchUser }}>
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
