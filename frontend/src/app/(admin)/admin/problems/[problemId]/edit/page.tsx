'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { FormInput, FormTextarea } from '@/components/ui/form-field';

export default function EditProblemPage() {
  const params = useParams();
  const problemId = params.problemId as string;
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    description: '',
    complexity: '0',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['problem', problemId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/problems/${problemId}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (data?.problem) {
      const p = data.problem;
      setForm({
        title: p.title || '',
        description: p.description || '',
        complexity: String(p.complexity || 0),
      });
    }
  }, [data]);

  if (isLoading) return <Spinner />;

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
      await api.put(`/api/v1/admin/problems/${problemId}`, payload);
      router.push(`/problems/${problemId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update problem';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Edit Problem</h1>
        <Link href="/admin" className="text-sm text-primary hover:underline">Back to Admin</Link>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}

            <FormInput label="Title" value={form.title} onChange={handleChange('title')} required />
            <FormInput label="Complexity" type="number" value={form.complexity} onChange={handleChange('complexity')} />
            <FormTextarea
              label="Description (HTML)"
              value={form.description}
              onChange={handleChange('description')}
              rows={10}
            />

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
