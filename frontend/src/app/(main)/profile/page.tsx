'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    patronymic: '',
    city: '',
    region: '',
    institution: '',
    specialty: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['user', user?.user_id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/users/${user!.user_id}`);
      return res.data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (data?.user) {
      const u = data.user;
      setForm({
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        patronymic: u.patronymic || '',
        city: u.city || '',
        region: u.region || '',
        institution: u.institution || '',
        specialty: u.specialty || '',
      });
    }
  }, [data]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Please sign in to edit your profile.</p>
        <Link href="/login" className="text-blue-600 hover:underline">Sign In</Link>
      </div>
    );
  }

  if (isLoading) return <Spinner />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.put(`/api/v1/users/${user.user_id}`, form);
      setSuccess('Profile updated successfully.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Update failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <Link href="/profile/password" className="text-sm text-blue-600 hover:underline">
          Change Password
        </Link>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-md p-3">{error}</div>}
          {success && <div className="bg-green-50 text-green-700 text-sm rounded-md p-3">{success}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Last Name" value={form.last_name} onChange={handleChange('last_name')} />
            <Input label="First Name" value={form.first_name} onChange={handleChange('first_name')} />
          </div>
          <Input label="Patronymic" value={form.patronymic} onChange={handleChange('patronymic')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={handleChange('city')} />
            <Input label="Region" value={form.region} onChange={handleChange('region')} />
          </div>
          <Input label="Institution" value={form.institution} onChange={handleChange('institution')} />
          <Input label="Specialty" value={form.specialty} onChange={handleChange('specialty')} />

          <Button type="submit" loading={loading}>
            Save Changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
