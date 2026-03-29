'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { ClassicStandings } from '@/components/standings/classic-standings';
import { AcmStandings } from '@/components/standings/acm-standings';
import type { StandingsData } from '@/types';

export default function ContestStandingsPage() {
  const params = useParams();
  const contestId = params.contestId as string;

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
      // API returns { standings: { problems, users, summary }, contest: {...} }
      return res.data.standings as StandingsData;
    },
  });

  const contestType = contestData?.contest?.contest_type ?? 'classic';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Standings</h1>
        <Link href={`/contests/${contestId}`} className="text-sm text-blue-600 hover:underline">
          Back to Contest
        </Link>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || !data.users || data.users.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No standings data available.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {contestType === 'acm' ? (
            <AcmStandings data={data} />
          ) : (
            <ClassicStandings data={data} />
          )}
        </div>
      )}
    </div>
  );
}
