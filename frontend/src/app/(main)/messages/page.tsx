'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Message } from '@/types';

export default function MessagesPage() {
  const { user } = useAuth();
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
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Please sign in to view messages.</p>
        <Link href="/login" className="text-primary hover:underline">Sign In</Link>
      </div>
    );
  }

  const messages: Message[] = data?.messages ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <Link href="/messages/compose">
          <Button size="sm">Compose</Button>
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
          Inbox
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'sent'
              ? 'text-primary border-primary'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          Sent
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : messages.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">No messages.</p>
      ) : (
        <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tab === 'inbox' ? 'From' : 'To'}</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
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
                      {m.message_subj || '(no subject)'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(m.message_date)}</TableCell>
                  <TableCell>
                    {!m.message_state && <Badge variant="outline">New</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
