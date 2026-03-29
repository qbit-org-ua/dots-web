'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Reply, ArrowLeft } from 'lucide-react';
import type { Message } from '@/types';

export default function MessageDetailPage() {
  const params = useParams();
  const messageId = params.messageId as string;
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['message', messageId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/messages/${messageId}`);
      return res.data;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t('auth.pleaseSignInMessages')}</p>
        <Link href="/login" className="text-primary hover:underline">{t('auth.signIn')}</Link>
      </div>
    );
  }

  if (isLoading) return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );

  const message: Message = data?.message;
  if (!message) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🔍</div>
        <p className="text-muted-foreground text-lg">{t('messages.notFound')}</p>
        <p className="text-muted-foreground text-sm">{t('messages.notFoundDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{message.message_subj || t('messages.noSubject')}</h1>
        <Link href="/messages" className="text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="size-3.5" />
          {t('messages.backToMessages')}
        </Link>
      </div>

      <Card>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <dt className="text-muted-foreground">{t('messages.from')}</dt>
              <dd className="font-medium">
                <Link href={`/users/${message.from_user_id}`} className="text-primary hover:underline">
                  {message.from_nickname || message.from_user_id}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('messages.to')}</dt>
              <dd className="font-medium">
                <Link href={`/users/${message.to_user_id}`} className="text-primary hover:underline">
                  {message.to_nickname || message.to_user_id}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('messages.date')}</dt>
              <dd>{formatDateTime(message.message_date)}</dd>
            </div>
          </dl>

          <div className="border-t border-border pt-4">
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm">{message.message_text}</div>
          </div>
        </CardContent>
      </Card>

      {message.from_user_id !== user.user_id && (
        <Link href={`/messages/compose?to=${message.from_nickname || message.from_user_id}&subject=Re: ${message.message_subj || ''}`}>
          <Button variant="secondary" className="gap-1.5">
            <Reply className="size-4" />
            {t('messages.reply')}
          </Button>
        </Link>
      )}
    </div>
  );
}
