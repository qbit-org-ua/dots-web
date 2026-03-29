'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormInput } from '@/components/ui/form-field';
import { Loader2, KeyRound } from 'lucide-react';

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t('auth.pleaseSignInProfile')}</p>
        <Link href="/login" className="text-primary hover:underline">{t('auth.signIn')}</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordsDoNotMatch'));
      return;
    }
    if (newPassword.length < 4) {
      setError(t('profile.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/v1/users/${user.user_id}/password`, {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setSuccess(t('profile.passwordChanged'));
      setTimeout(() => setSuccess(''), 3000);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      const msg = typeof errData === 'string' ? errData : errData?.message || t('profile.passwordChangeFailed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('profile.changePassword')}</h1>
        <Link href="/profile" className="text-sm text-primary hover:underline">
          {t('profile.backToProfile')}
        </Link>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}
            {success && <div className="bg-green-500/10 text-green-700 dark:text-green-300 text-sm rounded-md p-3">{success}</div>}

            <FormInput
              label={t('profile.currentPassword')}
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
            <FormInput
              label={t('profile.newPassword')}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <FormInput
              label={t('profile.confirmNewPassword')}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading ? (
                <><Loader2 className="size-4 animate-spin" />{t('profile.changing')}</>
              ) : (
                <><KeyRound className="size-4" />{t('profile.changePassword')}</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
