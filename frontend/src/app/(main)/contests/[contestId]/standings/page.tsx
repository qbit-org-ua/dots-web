'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassicStandings } from '@/components/standings/classic-standings';
import { AcmStandings } from '@/components/standings/acm-standings';
import type { StandingsData, StandingsUser } from '@/types';

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

/** Build a snapshot of scores for diff detection */
function buildSnapshot(data: StandingsData): Map<number, { place: number; total: string; scores: string[] }> {
  const map = new Map<number, { place: number; total: string; scores: string[] }>();
  for (const u of data.users) {
    map.set(u.user_id, {
      place: u.place,
      total: u.total_score,
      scores: u.scores.map(s => s.score),
    });
  }
  return map;
}

export type ChangedCells = {
  /** user_ids whose rank changed */
  rankChanged: Set<number>;
  /** user_id -> problem index set whose score changed */
  scoreChanged: Map<number, Set<number>>;
  /** user_ids whose total changed */
  totalChanged: Set<number>;
};

function computeChanges(
  prev: Map<number, { place: number; total: string; scores: string[] }>,
  curr: StandingsData,
): ChangedCells {
  const rankChanged = new Set<number>();
  const scoreChanged = new Map<number, Set<number>>();
  const totalChanged = new Set<number>();

  for (const u of curr.users) {
    const old = prev.get(u.user_id);
    if (!old) {
      // New user in standings
      rankChanged.add(u.user_id);
      totalChanged.add(u.user_id);
      continue;
    }
    if (old.place !== u.place) rankChanged.add(u.user_id);
    if (old.total !== u.total_score) totalChanged.add(u.user_id);
    for (let i = 0; i < u.scores.length; i++) {
      if (old.scores[i] !== u.scores[i]?.score) {
        if (!scoreChanged.has(u.user_id)) scoreChanged.set(u.user_id, new Set());
        scoreChanged.get(u.user_id)!.add(i);
      }
    }
  }
  return { rankChanged, scoreChanged, totalChanged };
}

export default function ContestStandingsPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const { user } = useAuth();
  const { t } = useTranslation();

  const prevSnapshot = useRef<Map<number, { place: number; total: string; scores: string[] }> | null>(null);
  const [changes, setChanges] = useState<ChangedCells | null>(null);

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
    refetchInterval: 10_000,
  });

  // Detect changes when data updates
  useEffect(() => {
    if (!data || !data.users) return;
    const currentSnapshot = buildSnapshot(data);

    if (prevSnapshot.current) {
      const diff = computeChanges(prevSnapshot.current, data);
      const hasChanges = diff.rankChanged.size > 0 || diff.scoreChanged.size > 0 || diff.totalChanged.size > 0;
      if (hasChanges) {
        setChanges(diff);
        // Clear highlights after animation duration
        const timer = setTimeout(() => setChanges(null), 3000);
        return () => clearTimeout(timer);
      }
    }

    prevSnapshot.current = currentSnapshot;
  }, [data]);

  const contestType = contestData?.contest?.contest_type ?? 'classic';
  const contestStatus = contestData?.status;
  const isLive = contestStatus === 'Going' || contestStatus === 'GoingFrozen';

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
          {isLive && (
            <div className="px-3 py-1 bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] text-center font-medium border-b border-border">
              ● {t('standings.liveUpdates')}
            </div>
          )}
          <div className="overflow-x-auto relative">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden z-10" />
            {contestType === 'acm' ? (
              <AcmStandings data={data} contestId={contestId} currentUserId={user?.user_id} canViewAll={!!(user && (user.access & 0x0100))} changes={changes} />
            ) : (
              <ClassicStandings data={data} contestId={contestId} currentUserId={user?.user_id} canViewAll={!!(user && (user.access & 0x0100))} changes={changes} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
