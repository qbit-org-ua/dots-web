'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassicStandings } from '@/components/standings/classic-standings';
import { AcmStandings } from '@/components/standings/acm-standings';
import type { StandingsData } from '@/types';

function StandingsTableSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
      <div className="p-1">
        <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-muted">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-12" />
          ))}
          <Skeleton className="h-4 w-12" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-12" />
            ))}
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContestStandingsPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: contestData } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}`);
      return res.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['standings', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}/standings`);
      return res.data.standings as StandingsData;
    },
  });

  const contestType = contestData?.contest?.contest_type ?? 'classic';

  return (
    <div className="space-y-4">
      {isLoading ? (
        <StandingsTableSkeleton />
      ) : !data || !data.users || data.users.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">📊</div>
          <p className="text-muted-foreground text-lg">{t('standings.noStandings')}</p>
          <p className="text-muted-foreground text-sm">{t('standings.noStandingsDesc')}</p>
          <Link href={`/contests/${contestId}/submit`} className="inline-block mt-2 text-sm text-primary hover:underline">
            {t('standings.submitSolution')}
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
          <div className="overflow-x-auto relative">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden z-10" />
            {contestType === 'acm' ? (
              <AcmStandings data={data} contestId={contestId} currentUserId={user?.user_id} />
            ) : (
              <ClassicStandings data={data} contestId={contestId} currentUserId={user?.user_id} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
