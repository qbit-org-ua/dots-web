'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export default function AdminEditUserPage() {
  const params = useParams();
  const userId = params.userId as string;

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
        <h1 className="text-2xl font-bold text-gray-900">Edit User: {nickname}</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/admin/users/${userId}/password`} className="text-blue-600 hover:underline">Change Password</Link>
          <Link href={`/users/${userId}`} className="text-blue-600 hover:underline">View Profile</Link>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-md p-3">{error}</div>}
          {success && <div className="bg-green-50 text-green-700 text-sm rounded-md p-3">{success}</div>}

          <Input label="Full Name (ПІБ)" value={form.fio} onChange={handleChange('fio')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="City" value={form.city_name} onChange={handleChange('city_name')} />
            <Input label="Region" value={form.region_name} onChange={handleChange('region_name')} />
          </div>
          <Input label="Country" value={form.country_name} onChange={handleChange('country_name')} />
          <Input label="Job" value={form.job} onChange={handleChange('job')} />

          <h3 className="text-sm font-semibold text-gray-700 pt-2 border-t">Student Info</h3>
          <Input label="Institution" value={form.u_institution_name} onChange={handleChange('u_institution_name')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Specialty" value={form.u_specialty} onChange={handleChange('u_specialty')} />
            <Input label="Course/Year" value={form.u_kurs} onChange={handleChange('u_kurs')} />
          </div>

          <h3 className="text-sm font-semibold text-gray-700 pt-2 border-t">School/Organization</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Region (Область)" value={form.o_region} onChange={handleChange('o_region')} />
            <Input label="District (Район)" value={form.o_district} onChange={handleChange('o_district')} />
          </div>
          <Input label="School/Organization Name" value={form.o_full_name} onChange={handleChange('o_full_name')} />
          <Input label="Grade (Клас)" value={form.o_grade} onChange={handleChange('o_grade')} />

          <Button type="submit" loading={loading}>
            Save Changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
