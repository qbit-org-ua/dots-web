'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';
import type { Language } from '@/types';

export default function CreateContestPage() {
  const router = useRouter();
  const { t } = useTranslation();
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
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('admin.creating');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('admin.createContest')}</h1>
        <Link href="/admin" className="text-sm text-primary hover:underline">{t('admin.backToAdmin')}</Link>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}

            <FormInput label={t('admin.contestTitle')} value={form.title} onChange={handleChange('title')} required />

            <FormSelect
              label={t('admin.contestType')}
              value={form.contest_type}
              onChange={handleChange('contest_type')}
              options={[
                { value: 'classic', label: t('contestType.classic') },
                { value: 'acm', label: 'ACM-ICPC' },
                { value: 'ioi', label: 'IOI' },
                { value: 'school', label: t('contestType.school') },
                { value: 'practice', label: t('contestType.practice') },
              ]}
            />

            <FormInput
              label={t('admin.startTime')}
              type="datetime-local"
              value={form.start_time}
              onChange={handleChange('start_time')}
              required
            />

            <FormInput
              label={t('admin.durationSeconds')}
              type="number"
              value={form.duration_time}
              onChange={handleChange('duration_time')}
            />

            <FormSelect
              label={t('admin.visible')}
              value={form.visible}
              onChange={handleChange('visible')}
              options={[
                { value: '1', label: t('admin.yes') },
                { value: '0', label: t('admin.no') },
              ]}
            />

            <FormTextarea
              label={t('admin.descriptionHtml')}
              value={form.description}
              onChange={handleChange('description')}
              rows={6}
            />

            <Button type="submit" disabled={loading}>
              {loading ? t('admin.creating') : t('admin.createContest')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
