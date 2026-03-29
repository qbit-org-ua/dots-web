'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormInput, FormTextarea } from '@/components/ui/form-field';

export default function ComposeMessagePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Please sign in to send messages.</p>
        <Link href="/login" className="text-primary hover:underline">Sign In</Link>
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
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to send message';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Compose Message</h1>
        <Link href="/messages" className="text-sm text-primary hover:underline">
          Back to Messages
        </Link>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}
            <FormInput
              label="To (nickname or user ID)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
            <FormInput
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <FormTextarea
              label="Message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              required
            />
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
              <Link href="/messages">
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
