'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import type { Message } from '@/types';

export default function MessageDetailPage() {
  const params = useParams();
  const messageId = params.messageId as string;
  const { user } = useAuth();

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
        <p className="text-gray-500 mb-4">Please sign in to view messages.</p>
        <Link href="/login" className="text-blue-600 hover:underline">Sign In</Link>
      </div>
    );
  }

  if (isLoading) return <Spinner />;

  const message: Message = data?.message;
  if (!message) {
    return <p className="text-center py-8 text-gray-500">Message not found.</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{message.message_subj || '(no subject)'}</h1>
        <Link href="/messages" className="text-sm text-blue-600 hover:underline">
          Back to Messages
        </Link>
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <dt className="text-gray-500">From</dt>
            <dd className="font-medium">
              <Link href={`/users/${message.from_user_id}`} className="text-blue-600 hover:underline">
                {message.from_nickname || message.from_user_id}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">To</dt>
            <dd className="font-medium">
              <Link href={`/users/${message.to_user_id}`} className="text-blue-600 hover:underline">
                {message.to_nickname || message.to_user_id}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Date</dt>
            <dd>{formatDateTime(message.message_date)}</dd>
          </div>
        </dl>

        <div className="border-t border-gray-200 pt-4">
          <div className="prose max-w-none whitespace-pre-wrap text-sm">{message.message_text}</div>
        </div>
      </Card>

      {message.from_user_id !== user.user_id && (
        <Link href={`/messages/compose?to=${message.from_nickname || message.from_user_id}&subject=Re: ${message.message_subj || ''}`}>
          <Button variant="secondary">Reply</Button>
        </Link>
      )}
    </div>
  );
}
