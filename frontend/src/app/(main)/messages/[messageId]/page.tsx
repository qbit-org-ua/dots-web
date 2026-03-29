'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
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
        <p className="text-muted-foreground mb-4">Please sign in to view messages.</p>
        <Link href="/login" className="text-primary hover:underline">Sign In</Link>
      </div>
    );
  }

  if (isLoading) return <Spinner />;

  const message: Message = data?.message;
  if (!message) {
    return <p className="text-center py-8 text-muted-foreground">Message not found.</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{message.message_subj || '(no subject)'}</h1>
        <Link href="/messages" className="text-sm text-primary hover:underline">
          Back to Messages
        </Link>
      </div>

      <Card>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <dt className="text-muted-foreground">From</dt>
              <dd className="font-medium">
                <Link href={`/users/${message.from_user_id}`} className="text-primary hover:underline">
                  {message.from_nickname || message.from_user_id}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">To</dt>
              <dd className="font-medium">
                <Link href={`/users/${message.to_user_id}`} className="text-primary hover:underline">
                  {message.to_nickname || message.to_user_id}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Date</dt>
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
          <Button variant="secondary">Reply</Button>
        </Link>
      )}
    </div>
  );
}
