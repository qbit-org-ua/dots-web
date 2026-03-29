'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import type { Language } from '@/types';

export default function CreateContestPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    contest_type: 'classic',
    start_time: '',
    duration_time: '18000',
    description: '',
    visible: '1',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: langData } = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const res = await api.get('/api/v1/languages');
      return res.data;
    },
  });

  const languages: Language[] = langData?.languages ?? [];

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        start_time: Math.floor(new Date(form.start_time).getTime() / 1000),
        duration_time: Number(form.duration_time),
        visible: Number(form.visible),
        languages: languages.map((l) => l.id).join(','),
      };
      const res = await api.post('/api/v1/admin/contests', payload);
      router.push(`/contests/${res.data.contest_id || res.data.contest?.contest_id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create contest';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Create Contest</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">Back to Admin</Link>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-md p-3">{error}</div>}

          <Input label="Title" value={form.title} onChange={handleChange('title')} required />

          <Select
            label="Contest Type"
            value={form.contest_type}
            onChange={handleChange('contest_type')}
            options={[
              { value: 'classic', label: 'Classic' },
              { value: 'acm', label: 'ACM-ICPC' },
              { value: 'ioi', label: 'IOI' },
              { value: 'school', label: 'School' },
              { value: 'practice', label: 'Practice' },
            ]}
          />

          <Input
            label="Start Time"
            type="datetime-local"
            value={form.start_time}
            onChange={handleChange('start_time')}
            required
          />

          <Input
            label="Duration (seconds)"
            type="number"
            value={form.duration_time}
            onChange={handleChange('duration_time')}
          />

          <Select
            label="Visible"
            value={form.visible}
            onChange={handleChange('visible')}
            options={[
              { value: '1', label: 'Yes' },
              { value: '0', label: 'No' },
            ]}
          />

          <Textarea
            label="Description (HTML)"
            value={form.description}
            onChange={handleChange('description')}
            rows={6}
          />

          <Button type="submit" loading={loading}>Create Contest</Button>
        </form>
      </Card>
    </div>
  );
}
