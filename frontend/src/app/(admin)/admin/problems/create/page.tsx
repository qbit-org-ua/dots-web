'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

export default function CreateProblemPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    complexity: '0',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        complexity: Number(form.complexity),
      };
      const res = await api.post('/api/v1/admin/problems', payload);
      router.push(`/problems/${res.data.problem_id || res.data.problem?.problem_id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create problem';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Create Problem</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">Back to Admin</Link>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-md p-3">{error}</div>}

          <Input label="Title" value={form.title} onChange={handleChange('title')} required />
          <Input label="Complexity" type="number" value={form.complexity} onChange={handleChange('complexity')} />
          <Textarea
            label="Description (HTML)"
            value={form.description}
            onChange={handleChange('description')}
            rows={10}
          />

          <Button type="submit" loading={loading}>Create Problem</Button>
        </form>
      </Card>
    </div>
  );
}
