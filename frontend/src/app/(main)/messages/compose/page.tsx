'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormInput, FormTextarea } from '@/components/ui/form-field';
import { Loader2, Send } from 'lucide-react';

export default function ComposeMessagePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t('auth.pleaseSignInSend')}</p>
        <Link href="/login" className="text-primary hover:underline">{t('auth.signIn')}</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/v1/messages', { to, subject, text });
      router.push('/messages');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('messages.sendFailed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('messages.composeMessage')}</h1>
        <Link href="/messages" className="text-sm text-primary hover:underline">
          {t('messages.backToMessages')}
        </Link>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}
            <FormInput
              label={t('messages.toField')}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
            <FormInput
              label={t('messages.subject')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <FormTextarea
              label={t('messages.messageText')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              required
            />
            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="gap-1.5">
                {loading ? (
                  <><Loader2 className="size-4 animate-spin" />{t('messages.sending')}</>
                ) : (
                  <><Send className="size-4" />{t('messages.sendMessage')}</>
                )}
              </Button>
              <Link href="/messages">
                <Button type="button" variant="secondary">{t('messages.cancel')}</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
