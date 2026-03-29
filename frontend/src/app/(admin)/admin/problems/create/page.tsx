'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormInput, FormTextarea } from '@/components/ui/form-field';

export default function CreateProblemPage() {
  const router = useRouter();
  const { t } = useTranslation();
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
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('common.error');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('admin.createProblem')}</h1>
        <Link href="/admin" className="text-sm text-primary hover:underline">{t('admin.backToAdmin')}</Link>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}

            <FormInput label={t('admin.title')} value={form.title} onChange={handleChange('title')} required />
            <FormInput label={t('admin.complexity')} type="number" value={form.complexity} onChange={handleChange('complexity')} />
            <FormTextarea
              label={t('admin.descriptionHtml')}
              value={form.description}
              onChange={handleChange('description')}
              rows={10}
            />

            <Button type="submit" disabled={loading}>
              {loading ? t('admin.creating') : t('admin.createProblem')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
