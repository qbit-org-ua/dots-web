'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormInput } from '@/components/ui/form-field';
import { Loader2, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, nickname);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('auth.registrationFailed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('auth.registrationSuccessful')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-green-600 dark:text-green-400 text-lg font-medium">{t('auth.accountCreated')}</div>
            <p className="text-muted-foreground">
              {t('auth.checkEmail')}
            </p>
            <Link href="/login" className="text-primary hover:underline text-sm">
              {t('auth.goToLogin')}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.register')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>
          )}
          <FormInput
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <FormInput
            label={t('auth.nickname')}
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading} className="w-full gap-1.5">
            {loading ? (
              <><Loader2 className="size-4 animate-spin" />{t('auth.registering')}</>
            ) : (
              <><UserPlus className="size-4" />{t('auth.register')}</>
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-primary hover:underline">
              {t('auth.signIn')}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
