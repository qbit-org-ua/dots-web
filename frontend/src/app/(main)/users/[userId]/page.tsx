'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/utils';
import { ACCESS } from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { UserFull } from '@/types';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between border-b border-border py-2">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
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
    return <p className="text-center py-8 text-muted-foreground">User not found.</p>;
  }

  const isAdmin = currentUser && (currentUser.access & ACCESS.SYSTEM_ADMIN) !== 0;
  const isOwnProfile = currentUser?.user_id === user.user_id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">User #{user.user_id}</h1>
        <Link href="/users" className="text-sm text-primary hover:underline">
          Back to Users
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent>
              <div className="flex flex-col items-center text-center">
                {user.avatar ? (
                  <img
                    src={`/api/v1/users/${user.user_id}/avatar`}
                    alt={user.nickname}
                    className="w-32 h-32 rounded-full object-cover mb-4"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-primary/10 text-primary flex items-center justify-center text-4xl font-bold mb-4">
                    {user.nickname.charAt(0).toUpperCase()}
                  </div>
                )}
                <h2 className="text-xl font-semibold">{user.nickname}</h2>
                {user.fio && <p className="text-muted-foreground mt-1">{user.fio}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="text-sm">
                <InfoRow label="Nickname" value={user.nickname} />
                <InfoRow label="Full Name" value={user.fio} />
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Region" value={user.o_region || user.u_region} />
                <InfoRow label="District" value={user.o_district} />
                <InfoRow label="Institution" value={user.o_full_name || user.o_short_name || user.u_institution_name} />
                <InfoRow label="Grade" value={user.o_grade} />
                <InfoRow label="Specialty" value={user.u_specialty} />
                <InfoRow label="Course" value={user.u_kurs} />
                <InfoRow label="City" value={user.city_name} />
                <InfoRow label="Country" value={user.country_name} />
                <InfoRow label="Job" value={user.job} />
                <InfoRow label="Registered" value={user.created ? formatDate(user.created) : '-'} />
                <InfoRow label="Last Login" value={user.lastlogin ? formatDateTime(user.lastlogin) : '-'} />
              </dl>
            </CardContent>
          </Card>

          {user.u_certificate && (
            <Card>
              <CardHeader>
                <CardTitle>Certificate / Consent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm prose dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: user.u_certificate }} />
              </CardContent>
            </Card>
          )}

          {user.o_cert && (
            <Card>
              <CardHeader>
                <CardTitle>Olympiad Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm prose dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: user.o_cert }} />
              </CardContent>
            </Card>
          )}

          {user.u_near && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm prose dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: user.u_near }} />
              </CardContent>
            </Card>
          )}

          {(isAdmin || isOwnProfile) && (
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href={isOwnProfile ? '/profile' : `/admin/users/${user.user_id}/edit`} className="text-primary hover:underline">
                Edit profile
              </Link>
              <Link href={isOwnProfile ? '/profile/password' : `/admin/users/${user.user_id}/password`} className="text-primary hover:underline">
                Change password
              </Link>
              <Link href={`/solutions?user_id=${user.user_id}`} className="text-primary hover:underline">
                All solutions by this user
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
