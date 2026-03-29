'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PenSquare, Mail } from 'lucide-react';
import type { Message } from '@/types';

function MessageTableSkeleton() {
  return (
    <div className="bg-muted rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');

  const { data, isLoading } = useQuery({
    queryKey: ['messages', tab],
    queryFn: async () => {
      const res = await api.get('/api/v1/messages', { params: { folder: tab } });
      return res.data;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🔒</div>
        <p className="text-muted-foreground text-lg">{t('auth.signInRequired')}</p>
        <p className="text-muted-foreground text-sm">{t('auth.pleaseSignInMessages')}</p>
        <Link href="/login" className="inline-block mt-2 text-sm text-primary hover:underline">{t('auth.signIn')}</Link>
      </div>
    );
  }

  const messages: Message[] = data?.messages ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{t('messages.title')}</h1>
        <Link href="/messages/compose">
          <Button size="sm" className="gap-1.5">
            <PenSquare className="size-3.5" />
            {t('messages.compose')}
          </Button>
        </Link>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('inbox')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'inbox'
              ? 'text-primary border-primary'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          {t('messages.inbox')}
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'sent'
              ? 'text-primary border-primary'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          {t('messages.sent')}
        </button>
      </div>

      {isLoading ? (
        <MessageTableSkeleton />
      ) : messages.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Mail className="size-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">
            {tab === 'inbox' ? t('messages.inboxEmpty') : t('messages.sentEmpty')}
          </p>
          <p className="text-muted-foreground text-sm">
            {tab === 'inbox' ? t('messages.inboxEmptyDesc') : t('messages.sentEmptyDesc')}
          </p>
          <Link href="/messages/compose">
            <Button size="sm" variant="secondary" className="mt-2 gap-1.5">
              <PenSquare className="size-3.5" />
              {t('messages.composeFirst')}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-muted rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
          <div className="overflow-x-auto relative">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden z-10" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tab === 'inbox' ? t('messages.from') : t('messages.to')}</TableHead>
                  <TableHead>{t('messages.subject')}</TableHead>
                  <TableHead>{t('messages.date')}</TableHead>
                  <TableHead>{t('messages.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((m) => (
                  <TableRow key={m.message_id} className={m.message_state ? '' : 'bg-primary/5'}>
                    <TableCell className="font-medium">
                      {tab === 'inbox' ? m.from_nickname || m.from_user_id : m.to_nickname || m.to_user_id}
                    </TableCell>
                    <TableCell>
                      <Link href={`/messages/${m.message_id}`} className="text-primary hover:underline">
                        {m.message_subj || t('messages.noSubject')}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(m.message_date)}</TableCell>
                    <TableCell>
                      {!m.message_state && <Badge variant="outline">{t('messages.new')}</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
