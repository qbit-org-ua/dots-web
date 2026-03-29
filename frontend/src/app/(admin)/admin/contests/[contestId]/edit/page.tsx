'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export default function EditContestPage() {
  const params = useParams();
  const contestId = params.contestId as string;
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

  const { data, isLoading } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (data?.contest) {
      const c = data.contest;
      const cd = data.contest_data;
      const dt = c.start_time ? new Date(c.start_time * 1000) : new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const localStr = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

      setForm({
        title: c.title || '',
        contest_type: c.contest_type || 'classic',
        start_time: localStr,
        duration_time: String(cd?.duration_time || 18000),
        description: c.description || '',
        visible: String(c.visible ?? 1),
      });
    }
  }, [data]);

  if (isLoading) return <Spinner />;

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
      };
      await api.put(`/api/v1/admin/contests/${contestId}`, payload);
      router.push(`/contests/${contestId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update contest';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit Contest</h1>
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

          <Button type="submit" loading={loading}>Save Changes</Button>
        </form>
      </Card>
    </div>
  );
}
