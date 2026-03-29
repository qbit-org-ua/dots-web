'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatDuration } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import { Trophy, Clock, Archive, Users } from 'lucide-react';
import type { Contest } from '@/types';

function LiveDot() {
  return (
    <span className="relative flex size-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-green-500" />
    </span>
  );
}

function ContestCard({ contest, t, isRegistered, status }: {
  contest: Contest;
  t: (k: string) => string;
  isRegistered: boolean;
  status: 'live' | 'upcoming' | 'archived';
}) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    if (status !== 'live') return;
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [status]);

  const remaining = contest.start_time > now ? contest.start_time - now : 0;

  return (
    <Link href={`/contests/${contest.contest_id}`} className="block h-full">
      <article className={cn(
        'rounded-xl p-5 transition-all group flex flex-col justify-between h-full relative overflow-hidden',
        status === 'live'
          ? 'bg-muted/80 hover:bg-muted border border-primary/20 hover:border-primary/40'
          : 'bg-muted/50 hover:bg-muted border border-border hover:border-foreground/20',
      )}>
        {status === 'live' && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />
        )}

        <div>
          {/* Status + participants */}
          <div className="flex justify-between items-start mb-4">
            {status === 'live' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-bold tracking-widest uppercase">
                <LiveDot />
                {t('contests.liveNow')}
              </span>
            ) : status === 'upcoming' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase">
                {remaining > 86400
                  ? t('contests.startsIn') + ' ' + Math.floor(remaining / 86400) + t('contests.days')
                  : remaining > 3600
                    ? t('contests.startsIn') + ' ' + Math.floor(remaining / 3600) + t('contests.hours')
                    : t('contests.upcoming')}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                {t('status.Finished')}
              </span>
            )}
            <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
              <Users className="size-3.5" />
              {contest.user_count}
            </div>
          </div>

          {/* Title */}
          <h2 className="font-semibold text-foreground text-base mb-2 group-hover:text-primary transition-colors leading-tight line-clamp-2">
            {contest.title}
          </h2>

          {/* Type tag */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-semibold border border-border">
              {t('contestType.' + contest.contest_type)}
            </span>
            {isRegistered && (
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
                {t('contests.registered')}
              </span>
            )}
          </div>
        </div>

        {/* Footer stats */}
        <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{t('contests.start')}</p>
            <p className="text-xs font-bold text-foreground">{formatDateTime(contest.start_time)}</p>
          </div>
          <div>
            {status === 'live' ? (
              <>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{t('contests.status')}</p>
                <p className="text-xs font-bold text-green-600 dark:text-green-400">{t('status.Going')}</p>
              </>
            ) : isRegistered ? (
              <>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{t('contests.yourStatus')}</p>
                <p className="text-xs font-bold text-primary">{t('contests.registered')}</p>
              </>
            ) : (
              <>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{t('contests.type')}</p>
                <p className="text-xs font-bold text-foreground">{t('contestType.' + contest.contest_type)}</p>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

function SectionSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-[0_0_320px] min-w-0">
          <div className="rounded-xl bg-muted/50 border border-border p-5 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
              <div className="space-y-1">
                <Skeleton className="h-2 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-2 w-10" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
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
  status,
}: {
  icon: React.ReactNode;
  title: string;
  contests: Contest[];
  t: (k: string) => string;
  emptyMessage: string;
  status: 'live' | 'upcoming' | 'archived';
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
            <CarouselItem key={c.contest_id} className="pl-4 basis-[320px]">
              <ContestCard
                contest={c}
                t={t}
                isRegistered={c.reg_status !== null && c.reg_status !== undefined}
                status={status}
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

import { cn } from '@/lib/utils';

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
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-foreground">{t('contests.title')}</h1>

      {isLoading ? (
        <div className="space-y-10">
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
            status="live"
          />
          <ContestSection
            icon={<Clock className="size-5 text-yellow-600" />}
            title={t('contests.upcoming')}
            contests={upcoming}
            t={t}
            emptyMessage={t('contests.noUpcoming')}
            status="upcoming"
          />
          <ContestSection
            icon={<Archive className="size-5 text-muted-foreground" />}
            title={t('contests.archived')}
            contests={archived}
            t={t}
            emptyMessage={t('contests.noArchived')}
            status="archived"
          />
        </>
      )}
    </div>
  );
}
