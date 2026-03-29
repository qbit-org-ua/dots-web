'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatDuration } from '@/lib/utils';
import { CONTEST_TYPES, REG_STATUS_LABELS, REG_MODE_LABELS, STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { ContestDetail, ContestData, ContestPage } from '@/types';

function getRegModeLabel(options: number): string {
  if (options & 0x04) return REG_MODE_LABELS[0x04];
  if (options & 0x02) return REG_MODE_LABELS[0x02];
  if (options & 0x01) return REG_MODE_LABELS[0x01];
  return 'вільна реєстрація';
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '00 - 00:00:00';
  const days = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const hms = [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  return `${String(days).padStart(2, '0')} - ${hms}`;
}

export default function ContestDetailPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const { user } = useAuth();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const leaveMutation = useMutation({
    mutationFn: () => api.post(`/api/v1/contests/${contestId}/logout`),
    onSuccess: () => refetch(),
  });

  if (isLoading) return <Spinner />;

  const contest: ContestDetail = data?.contest;
  const contestData: ContestData = data?.contest_data;
  const pages: ContestPage[] = data?.pages ?? [];
  const status: string = data?.status ?? '';
  const regStatus: number | null = data?.reg_status ?? null;
  const userRegistered: boolean = data?.user_registered ?? false;

  if (!contest) {
    return <p className="text-center py-8 text-gray-500">Contest not found.</p>;
  }

  const tabs = pages.filter((p) => p.status !== 'hidden');
  const durationSeconds = contestData?.duration_time ?? 0;
  const endTime = durationSeconds > 0 ? contest.start_time + durationSeconds : 0;
  const elapsed = now - contest.start_time;
  const remaining = endTime > 0 ? endTime - now : 0;

  const regStatusLabel = regStatus === null || regStatus === undefined
    ? 'не зареєстрований'
    : (REG_STATUS_LABELS[regStatus] ?? 'не зареєстрований');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{contest.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
            <span>{CONTEST_TYPES[contest.contest_type] || contest.contest_type}</span>
            <Badge color={(STATUS_COLORS[status] || 'neutral') as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>
              {status === 'going' || status === 'Going' ? 'Going' : status === 'finished' || status === 'Finished' ? 'Finished' : status === 'wait' || status === 'Wait' ? 'Waiting' : status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {user && !userRegistered && (
            <Button
              onClick={() => registerMutation.mutate()}
              loading={registerMutation.isPending}
              variant="success"
            >
              Register for Contest
            </Button>
          )}
          {userRegistered && (
            <>
              <Badge color="success">Registered</Badge>
              <Button
                onClick={() => leaveMutation.mutate()}
                loading={leaveMutation.isPending}
                variant="danger"
                className="ml-2"
              >
                Leave Contest
              </Button>
            </>
          )}
        </div>
      </div>

      <nav className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={
              tab.name === 'info'
                ? `/contests/${contestId}`
                : tab.name === 'users'
                ? `/contests/${contestId}/participants`
                : tab.name === 'upload'
                ? `/contests/${contestId}/submit`
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
          {contest.info ? (
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: contest.info }} />
          ) : (
            <p className="text-gray-500">No description available.</p>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Details">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Contest Type</dt>
                <dd className="font-medium">{CONTEST_TYPES[contest.contest_type] || contest.contest_type}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Start Time</dt>
                <dd className="font-medium">{formatDateTime(contest.start_time)}</dd>
              </div>
              {endTime > 0 && (
                <div>
                  <dt className="text-gray-500">End Time</dt>
                  <dd className="font-medium">{formatDateTime(endTime)}</dd>
                </div>
              )}
              {durationSeconds > 0 && (
                <div>
                  <dt className="text-gray-500">Duration</dt>
                  <dd className="font-medium">{formatDuration(durationSeconds)}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium">
                  <Badge color={(STATUS_COLORS[status] || 'neutral') as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>
                    {status === 'going' || status === 'Going' ? 'Going' : status === 'finished' || status === 'Finished' ? 'Finished' : status === 'wait' || status === 'Wait' ? 'Waiting' : status}
                  </Badge>
                </dd>
              </div>
              {elapsed > 0 && endTime > 0 && (
                <div>
                  <dt className="text-gray-500">Time Elapsed</dt>
                  <dd className="font-medium font-mono">
                    {formatTimeRemaining(Math.min(elapsed, durationSeconds))}
                  </dd>
                </div>
              )}
              {remaining > 0 && (
                <div>
                  <dt className="text-gray-500">Time Remaining</dt>
                  <dd className="font-medium font-mono">{formatTimeRemaining(remaining)}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Registration Mode</dt>
                <dd className="font-medium">{getRegModeLabel(contest.options)}</dd>
              </div>
              {user && (
                <div>
                  <dt className="text-gray-500">Your Registration</dt>
                  <dd className="font-medium">{regStatusLabel}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
