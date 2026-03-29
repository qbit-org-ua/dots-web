'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { formatDate, formatDateTime } from '@/lib/utils';
import { ACCESS } from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User, Mail, MapPin, Building, GraduationCap, Briefcase,
  Calendar, Clock, Globe, BookOpen, ArrowLeft
} from 'lucide-react';
import type { UserFull } from '@/types';

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between border-b border-border py-2 gap-4">
      <dt className="text-muted-foreground shrink-0 flex items-center gap-2">
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
        {label}
      </dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

function UserProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="md:col-span-2">
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/users/${userId}`);
      return res.data;
    },
  });

  if (isLoading) return <UserProfileSkeleton />;

  const user: UserFull = data?.user;
  if (!user) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">👤</div>
        <p className="text-muted-foreground text-lg">{t('users.notFound')}</p>
        <p className="text-muted-foreground text-sm">{t('users.notFoundDesc')}</p>
      </div>
    );
  }

  const isAdmin = currentUser && (currentUser.access & ACCESS.SYSTEM_ADMIN) !== 0;
  const isOwnProfile = currentUser?.user_id === user.user_id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">User #{user.user_id}</h1>
        <Link href="/users" className="text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="size-3.5" />
          {t('users.backToUsers')}
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
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/30 text-primary flex items-center justify-center text-4xl font-bold mb-4 ring-2 ring-primary/20">
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('users.profileInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="text-sm">
                <InfoRow label={t('users.nickname')} value={user.nickname} icon={<User className="size-3.5" />} />
                <InfoRow label={t('users.fullName')} value={user.fio} icon={<User className="size-3.5" />} />
                <InfoRow label={t('users.email')} value={user.email} icon={<Mail className="size-3.5" />} />
                <InfoRow label={t('users.region')} value={user.o_region || user.u_region} icon={<MapPin className="size-3.5" />} />
                <InfoRow label={t('users.district')} value={user.o_district} icon={<MapPin className="size-3.5" />} />
                <InfoRow label={t('users.institution')} value={user.o_full_name || user.o_short_name || user.u_institution_name} icon={<Building className="size-3.5" />} />
                <InfoRow label={t('users.grade')} value={user.o_grade} icon={<GraduationCap className="size-3.5" />} />
                <InfoRow label={t('users.specialty')} value={user.u_specialty} icon={<BookOpen className="size-3.5" />} />
                <InfoRow label={t('users.course')} value={user.u_kurs} icon={<GraduationCap className="size-3.5" />} />
                <InfoRow label={t('users.city')} value={user.city_name} icon={<MapPin className="size-3.5" />} />
                <InfoRow label={t('users.country')} value={user.country_name} icon={<Globe className="size-3.5" />} />
                <InfoRow label={t('users.job')} value={user.job} icon={<Briefcase className="size-3.5" />} />
                <InfoRow label={t('users.registered')} value={user.created ? formatDate(user.created) : '-'} icon={<Calendar className="size-3.5" />} />
                <InfoRow label={t('users.lastLogin')} value={user.lastlogin ? formatDateTime(user.lastlogin) : '-'} icon={<Clock className="size-3.5" />} />
              </dl>
            </CardContent>
          </Card>

          {user.u_certificate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('users.certificate')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm prose dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: user.u_certificate }} />
              </CardContent>
            </Card>
          )}

          {user.o_cert && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('users.olympiadInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm prose dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: user.o_cert }} />
              </CardContent>
            </Card>
          )}

          {user.u_near && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('users.additionalInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm prose dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: user.u_near }} />
              </CardContent>
            </Card>
          )}

          {(isAdmin || isOwnProfile) && (
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href={isOwnProfile ? '/profile' : `/admin/users/${user.user_id}/edit`} className="text-primary hover:underline">
                {t('users.editProfile')}
              </Link>
              <Link href={isOwnProfile ? '/profile/password' : `/admin/users/${user.user_id}/password`} className="text-primary hover:underline">
                {t('users.changePassword')}
              </Link>
              <Link href={`/solutions?user_id=${user.user_id}`} className="text-primary hover:underline">
                {t('users.allSolutions')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
