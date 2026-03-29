'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatDuration } from '@/lib/utils';
import { CONTEST_TYPES, REG_STATUS_LABELS, REG_MODE_LABELS, STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { ContestDetail, ContestData } from '@/types';

const BADGE_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  success: 'default',
  warning: 'secondary',
  danger: 'destructive',
  info: 'outline',
  neutral: 'secondary',
};

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
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
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
  const status: string = data?.status ?? '';
  const regStatus: number | null = data?.reg_status ?? null;
  const userRegistered: boolean = data?.user_registered ?? false;

  if (!contest) {
    return <p className="text-center py-8 text-muted-foreground">Contest not found.</p>;
  }

  const durationSeconds = contestData?.duration_time ?? 0;
  const endTime = durationSeconds > 0 ? contest.start_time + durationSeconds : 0;
  const elapsed = now - contest.start_time;
  const remaining = endTime > 0 ? endTime - now : 0;

  const regStatusLabel = regStatus === null || regStatus === undefined
    ? 'не зареєстрований'
    : (REG_STATUS_LABELS[regStatus] ?? 'не зареєстрований');

  return (
    <div className="space-y-6">
      {/* Registration actions */}
      {user && (
        <div className="flex gap-3 items-center">
          {!userRegistered ? (
            <Button
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {registerMutation.isPending ? 'Registering...' : 'Register for Contest'}
            </Button>
          ) : (
            <>
              <Badge variant="default">Registered</Badge>
              <Button
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
                variant="destructive"
                size="sm"
              >
                {leaveMutation.isPending ? 'Leaving...' : 'Leave Contest'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Content + details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardContent>
            {contest.info ? (
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: contest.info }} />
            ) : (
              <p className="text-muted-foreground">No description available.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Contest Type</dt>
                  <dd className="font-medium">{CONTEST_TYPES[contest.contest_type] || contest.contest_type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Start Time</dt>
                  <dd className="font-medium">{formatDateTime(contest.start_time)}</dd>
                </div>
                {endTime > 0 && (
                  <div>
                    <dt className="text-muted-foreground">End Time</dt>
                    <dd className="font-medium">{formatDateTime(endTime)}</dd>
                  </div>
                )}
                {durationSeconds > 0 && (
                  <div>
                    <dt className="text-muted-foreground">Duration</dt>
                    <dd className="font-medium">{formatDuration(durationSeconds)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd><Badge variant={BADGE_VARIANT_MAP[STATUS_COLORS[status] || 'neutral'] || 'secondary'}>{status}</Badge></dd>
                </div>
                {elapsed > 0 && endTime > 0 && (
                  <div>
                    <dt className="text-muted-foreground">Time Elapsed</dt>
                    <dd className="font-medium font-mono">{formatTimeRemaining(Math.min(elapsed, durationSeconds))}</dd>
                  </div>
                )}
                {remaining > 0 && (
                  <div>
                    <dt className="text-muted-foreground">Time Remaining</dt>
                    <dd className="font-medium font-mono">{formatTimeRemaining(remaining)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Registration Mode</dt>
                  <dd className="font-medium">{getRegModeLabel(contest.options)}</dd>
                </div>
                {user && (
                  <div>
                    <dt className="text-muted-foreground">Your Registration</dt>
                    <dd className="font-medium">{regStatusLabel}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
