'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';

export default function EditContestPage() {
  const params = useParams();
  const contestId = params.contestId as string;
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
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('profile.updateFailed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('admin.editContest')}</h1>
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
              {loading ? t('admin.saving') : t('common.saveChanges')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
