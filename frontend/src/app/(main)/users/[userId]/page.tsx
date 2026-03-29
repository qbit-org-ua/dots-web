'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/utils';
import { ACCESS } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { UserFull } from '@/types';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between border-b border-gray-100 py-2">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user: currentUser } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/users/${userId}`);
      return res.data;
    },
  });

  if (isLoading) return <Spinner />;

  const user: UserFull = data?.user;
  if (!user) {
    return <p className="text-center py-8 text-gray-500">User not found.</p>;
  }

  const isAdmin = currentUser && (currentUser.access & ACCESS.SYSTEM_ADMIN) !== 0;
  const isOwnProfile = currentUser?.user_id === user.user_id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User #{user.user_id}</h1>
        <Link href="/users" className="text-sm text-blue-600 hover:underline">
          Back to Users
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <div className="flex flex-col items-center text-center">
              {user.avatar ? (
                <img
                  src={`/api/v1/users/${user.user_id}/avatar`}
                  alt={user.nickname}
                  className="w-32 h-32 rounded-full object-cover mb-4"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-4xl font-bold mb-4">
                  {user.nickname.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="text-xl font-semibold">{user.nickname}</h2>
              {user.fio && <p className="text-gray-500 mt-1">{user.fio}</p>}
            </div>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card title="Profile Information">
            <dl className="text-sm">
              <InfoRow label="Nickname" value={user.nickname} />
              <InfoRow label="Full Name (ПІБ)" value={user.fio} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Region (Область)" value={user.o_region || user.u_region} />
              <InfoRow label="District (Район)" value={user.o_district} />
              <InfoRow label="Institution" value={user.o_full_name || user.o_short_name || user.u_institution_name} />
              <InfoRow label="Grade (Клас)" value={user.o_grade} />
              <InfoRow label="Specialty" value={user.u_specialty} />
              <InfoRow label="Course" value={user.u_kurs} />
              <InfoRow label="City" value={user.city_name} />
              <InfoRow label="Country" value={user.country_name} />
              <InfoRow label="Job" value={user.job} />
              <InfoRow label="Registered" value={user.created ? formatDate(user.created) : '-'} />
              <InfoRow label="Last Login" value={user.lastlogin ? formatDateTime(user.lastlogin) : '-'} />
            </dl>
          </Card>

          {user.u_certificate && (
            <Card title="Certificate / Consent">
              <div className="text-sm prose max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: user.u_certificate }} />
            </Card>
          )}

          {user.o_cert && (
            <Card title="Olympiad Info">
              <div className="text-sm prose max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: user.o_cert }} />
            </Card>
          )}

          {user.u_near && (
            <Card title="Additional Info">
              <div className="text-sm prose max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: user.u_near }} />
            </Card>
          )}

          {(isAdmin || isOwnProfile) && (
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href={isOwnProfile ? '/profile' : `/admin/users/${user.user_id}/edit`} className="text-blue-600 hover:underline">
                Edit profile
              </Link>
              <Link href={isOwnProfile ? '/profile/password' : `/admin/users/${user.user_id}/password`} className="text-blue-600 hover:underline">
                Change password
              </Link>
              <Link href={`/solutions?user_id=${user.user_id}`} className="text-blue-600 hover:underline">
                All solutions by this user
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
