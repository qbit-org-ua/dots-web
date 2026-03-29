'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormInput } from '@/components/ui/form-field';

export default function AdminChangePasswordPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/users/${userId}`);
      return res.data;
    },
  });

  const nickname = data?.user?.nickname || `User #${userId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/v1/users/${userId}/password`, {
        old_password: '',
        new_password: newPassword,
      });
      setSuccess('Password changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to change password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Change Password</h1>
        <Link href={`/users/${userId}`} className="text-sm text-primary hover:underline">
          Back to Profile
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        Changing password for <Link href={`/users/${userId}`} className="text-primary hover:underline font-medium">{nickname}</Link>
      </p>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}
            {success && <div className="bg-green-500/10 text-green-700 dark:text-green-300 text-sm rounded-md p-3">{success}</div>}
            <FormInput
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <FormInput
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
