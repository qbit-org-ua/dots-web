'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormInput } from '@/components/ui/form-field';
import { Loader2, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/contests');
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      setError(typeof errData === 'string' ? errData : errData?.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.signIn')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>
          )}
          <FormInput
            label={t('auth.emailOrUsername')}
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <FormInput
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading} className="w-full gap-1.5">
            {loading ? (
              <><Loader2 className="size-4 animate-spin" />{t('auth.signingIn')}</>
            ) : (
              <><LogIn className="size-4" />{t('auth.signIn')}</>
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="text-primary hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
