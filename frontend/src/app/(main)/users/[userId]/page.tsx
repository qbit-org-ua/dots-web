'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { UserFull } from '@/types';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{user.nickname}</h1>
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

        <div className="md:col-span-2">
          <Card title="Profile Information">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              {user.city_name && (
                <div>
                  <dt className="text-gray-500">City</dt>
                  <dd className="font-medium">{user.city_name}</dd>
                </div>
              )}
              {user.region_name && (
                <div>
                  <dt className="text-gray-500">Region</dt>
                  <dd className="font-medium">{user.region_name}</dd>
                </div>
              )}
              {user.u_institution_name && (
                <div>
                  <dt className="text-gray-500">Institution</dt>
                  <dd className="font-medium">{user.u_institution_name}</dd>
                </div>
              )}
              {user.u_specialty && (
                <div>
                  <dt className="text-gray-500">Specialty</dt>
                  <dd className="font-medium">{user.u_specialty}</dd>
                </div>
              )}
              {user.job && (
                <div>
                  <dt className="text-gray-500">Job</dt>
                  <dd className="font-medium">{user.job}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Registered</dt>
                <dd className="font-medium">{user.created ? formatDate(user.created) : '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Login</dt>
                <dd className="font-medium">{user.lastlogin ? formatDateTime(user.lastlogin) : '-'}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
