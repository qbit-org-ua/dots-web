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
        <p className="text-gray-500 mb-4">Please sign in to view messages.</p>
        <Link href="/login" className="text-blue-600 hover:underline">Sign In</Link>
      </div>
    );
  }

  const messages: Message[] = data?.messages ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <Link href="/messages/compose">
          <Button size="sm">Compose</Button>
        </Link>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('inbox')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'inbox'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Inbox
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'sent'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Sent
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : messages.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No messages.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                <TableRow key={m.message_id} className={m.is_read ? '' : 'bg-blue-50'}>
                  <TableCell className="font-medium">
                    {tab === 'inbox' ? m.from_nickname || m.from_user_id : m.to_nickname || m.to_user_id}
                  </TableCell>
                  <TableCell>
                    <Link href={`/messages/${m.message_id}`} className="text-blue-600 hover:underline">
                      {m.subject || '(no subject)'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-500">{formatDateTime(m.posted_time)}</TableCell>
                  <TableCell>
                    {!m.is_read && <Badge color="info">New</Badge>}
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
