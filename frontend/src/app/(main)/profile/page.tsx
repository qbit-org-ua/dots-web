'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { FormInput } from '@/components/ui/form-field';

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    fio: '', city_name: '', region_name: '', country_name: '', job: '',
    u_institution_name: '', u_specialty: '', u_kurs: '',
    o_region: '', o_district: '', o_full_name: '', o_grade: '',
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
        fio: u.fio || '', city_name: u.city_name || '', region_name: u.region_name || '',
        country_name: u.country_name || '', job: u.job || '',
        u_institution_name: u.u_institution_name || '', u_specialty: u.u_specialty || '',
        u_kurs: u.u_kurs || '', o_region: u.o_region || '', o_district: u.o_district || '',
        o_full_name: u.o_full_name || '', o_grade: u.o_grade || '',
      });
    }
  }, [data]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Please sign in to edit your profile.</p>
        <Link href="/login" className="text-primary hover:underline">Sign In</Link>
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
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Update failed';
      setError(typeof msg === 'string' ? msg : 'Update failed');
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
        <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
        <Link href="/profile/password" className="text-sm text-primary hover:underline">
          Change Password
        </Link>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}
            {success && <div className="bg-green-500/10 text-green-700 dark:text-green-300 text-sm rounded-md p-3">{success}</div>}

            <FormInput label="Full Name" value={form.fio} onChange={handleChange('fio')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="City" value={form.city_name} onChange={handleChange('city_name')} />
              <FormInput label="Region" value={form.region_name} onChange={handleChange('region_name')} />
            </div>
            <FormInput label="Country" value={form.country_name} onChange={handleChange('country_name')} />
            <FormInput label="Job" value={form.job} onChange={handleChange('job')} />

            <h3 className="text-sm font-semibold text-foreground pt-2 border-t border-border">Student Info</h3>
            <FormInput label="Institution" value={form.u_institution_name} onChange={handleChange('u_institution_name')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="Specialty" value={form.u_specialty} onChange={handleChange('u_specialty')} />
              <FormInput label="Course/Year" value={form.u_kurs} onChange={handleChange('u_kurs')} />
            </div>

            <h3 className="text-sm font-semibold text-foreground pt-2 border-t border-border">School/Organization</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="Region" value={form.o_region} onChange={handleChange('o_region')} />
              <FormInput label="District" value={form.o_district} onChange={handleChange('o_district')} />
            </div>
            <FormInput label="School/Organization Name" value={form.o_full_name} onChange={handleChange('o_full_name')} />
            <FormInput label="Grade" value={form.o_grade} onChange={handleChange('o_grade')} />

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
