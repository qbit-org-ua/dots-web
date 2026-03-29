'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import { Trophy, Clock, Archive, Users, Calendar } from 'lucide-react';
import type { Contest } from '@/types';

function ContestCard({ contest, t, isRegistered }: { contest: Contest; t: (k: string) => string; isRegistered: boolean }) {
  return (
    <Link href={`/contests/${contest.contest_id}`}>
      <div className="h-full rounded-xl bg-card text-card-foreground shadow-sm border border-foreground/15 hover:border-foreground/25 hover:shadow-md transition-all cursor-pointer">
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
              {contest.title}
            </h3>
            {isRegistered && (
              <Badge variant="default" className="shrink-0 text-xs">
                {t('contests.registered')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-normal text-xs">
              {t('contestType.' + contest.contest_type)}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {formatDateTime(contest.start_time)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {contest.user_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SectionSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-[0_0_300px] min-w-0">
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-20" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-12" />
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

function ContestSection({
  icon,
  title,
  contests,
  t,
  emptyMessage,
}: {
  icon: React.ReactNode;
  title: string;
  contests: Contest[];
  t: (k: string) => string;
  emptyMessage: string;
}) {
  if (contests.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          {icon}
          {title}
          <span className="text-sm font-normal text-muted-foreground">(0)</span>
        </h2>
        <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
      </section>
    );
  }

  const sorted = [...contests].sort((a, b) => {
    const aReg = a.reg_status !== null && a.reg_status !== undefined;
    const bReg = b.reg_status !== null && b.reg_status !== undefined;
    if (aReg && !bReg) return -1;
    if (!aReg && bReg) return 1;
    return 0;
  });

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        {icon}
        {title}
        <span className="text-sm font-normal text-muted-foreground">({contests.length})</span>
      </h2>
      <Carousel opts={{ align: 'start', dragFree: true }}>
        <CarouselContent className="-ml-4">
          {sorted.map((c) => (
            <CarouselItem key={c.contest_id} className="pl-4 basis-[300px]">
              <ContestCard
                contest={c}
                t={t}
                isRegistered={c.reg_status !== null && c.reg_status !== undefined}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {contests.length > 3 && (
          <>
            <CarouselPrevious className="-left-4 size-8" />
            <CarouselNext className="-right-4 size-8" />
          </>
        )}
      </Carousel>
    </section>
  );
}

export default function ContestsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['contests', 'all'],
    queryFn: async () => {
      const res = await api.get('/api/v1/contests', { params: { per_page: 500 } });
      return res.data;
    },
  });

  const contests: Contest[] = data?.contests ?? [];

  const inProgress = contests.filter((c) => c.status === 'Going' || c.status === 'GoingFrozen');
  const upcoming = contests.filter((c) => c.status === 'Wait');
  const archived = contests.filter((c) => c.status === 'Finished' || c.status === 'FinishedFrozen');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">{t('contests.title')}</h1>

      {isLoading ? (
        <div className="space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <SectionSkeleton />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <SectionSkeleton />
          </div>
        </div>
      ) : contests.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">🏆</div>
          <p className="text-muted-foreground text-lg">{t('contests.noContests')}</p>
          <p className="text-muted-foreground text-sm">{t('contests.checkBackLater')}</p>
        </div>
      ) : (
        <>
          <ContestSection
            icon={<Trophy className="size-5 text-green-600" />}
            title={t('contests.inProgress')}
            contests={inProgress}
            t={t}
            emptyMessage={t('contests.noInProgress')}
          />
          <ContestSection
            icon={<Clock className="size-5 text-yellow-600" />}
            title={t('contests.upcoming')}
            contests={upcoming}
            t={t}
            emptyMessage={t('contests.noUpcoming')}
          />
          <ContestSection
            icon={<Archive className="size-5 text-muted-foreground" />}
            title={t('contests.archived')}
            contests={archived}
            t={t}
            emptyMessage={t('contests.noArchived')}
          />
        </>
      )}
    </div>
  );
}
