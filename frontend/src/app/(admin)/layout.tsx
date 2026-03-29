'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui/spinner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) return <Spinner />;

  if (!user || user.access < 1) {
    router.push('/');
    return null;
  }

  return <>{children}</>;
}
