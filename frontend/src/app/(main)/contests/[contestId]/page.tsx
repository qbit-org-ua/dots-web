'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatDuration } from '@/lib/utils';
import { CONTEST_TYPES, STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { ContestDetail, ContestData, ContestPage } from '@/types';

export default function ContestDetailPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}`);
      return res.data;
    },
  });

  const registerMutation = useMutation({
    mutationFn: () => api.post(`/api/v1/contests/${contestId}/register`),
    onSuccess: () => refetch(),
  });

  if (isLoading) return <Spinner />;

  const contest: ContestDetail = data?.contest;
  const contestData: ContestData = data?.contest_data;
  const pages: ContestPage[] = data?.pages ?? [];
  const status: string = data?.status ?? '';
  const regStatus: string = data?.reg_status ?? '';

  if (!contest) {
    return <p className="text-center py-8 text-gray-500">Contest not found.</p>;
  }

  const tabs = pages.filter((p) => p.status !== 'hidden');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{contest.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
            <span>{CONTEST_TYPES[contest.contest_type] || contest.contest_type}</span>
            <Badge color={(STATUS_COLORS[status] || 'neutral') as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>
              {status === 'going' ? 'Going' : status === 'finished' ? 'Finished' : status === 'wait' ? 'Waiting' : status}
            </Badge>
          </div>
        </div>
        {user && regStatus === 'not_registered' && (
          <Button
            onClick={() => registerMutation.mutate()}
            loading={registerMutation.isPending}
            variant="success"
          >
            Register for Contest
          </Button>
        )}
        {regStatus === 'registered' && (
          <Badge color="success">Registered</Badge>
        )}
      </div>

      <nav className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={
              tab.name === 'info'
                ? `/contests/${contestId}`
                : tab.name === 'participants'
                ? `/contests/${contestId}#participants`
                : `/contests/${contestId}/${tab.name}`
            }
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 border-b-2 border-transparent hover:border-blue-600 whitespace-nowrap transition-colors"
          >
            {tab.title}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          {contest.description ? (
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: contest.description }} />
          ) : (
            <p className="text-gray-500">No description available.</p>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Details">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Start Time</dt>
                <dd className="font-medium">{formatDateTime(contest.start_time)}</dd>
              </div>
              {contestData?.duration_time > 0 && (
                <div>
                  <dt className="text-gray-500">Duration</dt>
                  <dd className="font-medium">{formatDuration(contestData.duration_time)}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium">{CONTEST_TYPES[contest.contest_type] || contest.contest_type}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
