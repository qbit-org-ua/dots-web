'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { FormInput } from '@/components/ui/form-field';

export default function AdminEditUserPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { t } = useTranslation();

  const [form, setForm] = useState({
    fio: '', city_name: '', region_name: '', country_name: '', job: '',
    u_institution_name: '', u_specialty: '', u_kurs: '',
    o_region: '', o_district: '', o_full_name: '', o_grade: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/users/${userId}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (data?.user) {
      const u = data.user;
      setForm({
        fio: u.fio || '', city_name: u.city_name || '', region_name: u.region_name || '',
        country_name: u.country_name || '', job: u.job || '',
        u_institution_name: u.u_institution_name || '', u_specialty: u.u_specialty || '',
        u_kurs: u.u_kurs || '', o_region: u.o_region || '', o_district: u.o_district || '',
        o_full_name: u.o_full_name || '', o_grade: u.o_grade || '',
      });
    }
  }, [data]);

  if (isLoading) return <Spinner />;

  const nickname = data?.user?.nickname || `User #${userId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.put(`/api/v1/users/${userId}`, form);
      setSuccess(t('profile.profileUpdated'));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || t('profile.updateFailed');
      setError(typeof msg === 'string' ? msg : t('profile.updateFailed'));
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
        <h1 className="text-2xl font-bold text-foreground">{t('admin.editUser')}: {nickname}</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/admin/users/${userId}/password`} className="text-primary hover:underline">{t('profile.changePassword')}</Link>
          <Link href={`/users/${userId}`} className="text-primary hover:underline">{t('users.viewProfile')}</Link>
        </div>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}
            {success && <div className="bg-green-500/10 text-green-700 dark:text-green-300 text-sm rounded-md p-3">{success}</div>}

            <FormInput label={t('profile.fullName')} value={form.fio} onChange={handleChange('fio')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label={t('profile.city')} value={form.city_name} onChange={handleChange('city_name')} />
              <FormInput label={t('profile.region')} value={form.region_name} onChange={handleChange('region_name')} />
            </div>
            <FormInput label={t('profile.country')} value={form.country_name} onChange={handleChange('country_name')} />
            <FormInput label={t('profile.job')} value={form.job} onChange={handleChange('job')} />

            <h3 className="text-sm font-semibold text-foreground pt-2 border-t border-border">{t('profile.studentInfo')}</h3>
            <FormInput label={t('profile.institution')} value={form.u_institution_name} onChange={handleChange('u_institution_name')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label={t('profile.specialty')} value={form.u_specialty} onChange={handleChange('u_specialty')} />
              <FormInput label={t('profile.courseYear')} value={form.u_kurs} onChange={handleChange('u_kurs')} />
            </div>

            <h3 className="text-sm font-semibold text-foreground pt-2 border-t border-border">{t('profile.schoolOrg')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label={t('profile.orgRegion')} value={form.o_region} onChange={handleChange('o_region')} />
              <FormInput label={t('profile.orgDistrict')} value={form.o_district} onChange={handleChange('o_district')} />
            </div>
            <FormInput label={t('profile.schoolOrgName')} value={form.o_full_name} onChange={handleChange('o_full_name')} />
            <FormInput label={t('profile.grade')} value={form.o_grade} onChange={handleChange('o_grade')} />

            <Button type="submit" disabled={loading}>
              {loading ? t('admin.saving') : t('common.saveChanges')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
