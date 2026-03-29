'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function RegisterPage() {
  const { register } = useAuth();
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
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card title="Registration Successful">
        <div className="text-center space-y-4">
          <div className="text-green-600 text-lg font-medium">Account created!</div>
          <p className="text-gray-600">
            Please check your email for your password and activation link.
          </p>
          <Link href="/login" className="text-blue-600 hover:underline text-sm">
            Go to Login
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Register">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-md p-3">{error}</div>
        )}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <Input
          label="Nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
        <Button type="submit" loading={loading} className="w-full">
          Register
        </Button>
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </Card>
  );
}
