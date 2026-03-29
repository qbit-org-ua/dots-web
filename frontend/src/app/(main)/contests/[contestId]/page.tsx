'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime, formatDuration } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import type { ContestDetail, ContestData } from '@/types';

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Going: 'default',
  Finished: 'secondary',
  Wait: 'secondary',
  GoingFrozen: 'outline',
  FinishedFrozen: 'secondary',
};

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '00 - 00:00:00';
  const days = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const hms = [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  return `${String(days).padStart(2, '0')} - ${hms}`;
}

function ContestDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2"><Skeleton className="h-48 w-full rounded-lg" /></div>
        <div><Skeleton className="h-64 w-full rounded-lg" /></div>
      </div>
    </div>
  );
}

export default function ContestDetailPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const { user } = useAuth();
  const { t } = useTranslation();
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

  if (isLoading) return <ContestDetailSkeleton />;

  const contest: ContestDetail = data?.contest;
  const contestData: ContestData = data?.contest_data;
  const status: string = data?.status ?? '';
  const userRegistered: boolean = data?.user_registered ?? false;

  if (!contest) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🔍</div>
        <p className="text-muted-foreground text-lg">{t('contests.notFound')}</p>
        <p className="text-muted-foreground text-sm">{t('contests.notFoundDesc')}</p>
      </div>
    );
  }

  const durationSeconds = contestData?.duration_time ?? 0;
  const endTime = durationSeconds > 0 ? contest.start_time + durationSeconds : 0;
  const elapsed = now - contest.start_time;
  const remaining = endTime > 0 ? endTime - now : 0;
  const progress = durationSeconds > 0 ? Math.min(Math.max(elapsed / durationSeconds, 0), 1) * 100 : 0;

  function getRegModeLabel(options: number): string {
    if (options & 0x04) return t('regMode.internal');
    if (options & 0x02) return t('regMode.confirm');
    return t('regMode.free');
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardContent>
            {contest.info ? (
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: contest.info }} />
            ) : (
              <div className="text-center py-8 space-y-2">
                <p className="text-muted-foreground">{t('contests.noDescription')}</p>
                <p className="text-muted-foreground text-sm">{t('contests.checkProblemsTab')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('contests.details')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t('contests.type')}</dt>
                  <dd><Badge variant="outline" className="font-normal">{t('contestType.' + contest.contest_type)}</Badge></dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t('contests.start')}</dt>
                  <dd className="font-medium text-xs">{formatDateTime(contest.start_time)}</dd>
                </div>
                {endTime > 0 && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{t('contests.end')}</dt>
                    <dd className="font-medium text-xs">{formatDateTime(endTime)}</dd>
                  </div>
                )}
                {durationSeconds > 0 && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{t('contests.duration')}</dt>
                    <dd className="font-medium">{formatDuration(durationSeconds)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t('contests.status')}</dt>
                  <dd><Badge variant={STATUS_BADGE_VARIANT[status] || 'secondary'}>{t('status.' + status)}</Badge></dd>
                </div>

                {elapsed > 0 && endTime > 0 && durationSeconds > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t('contests.elapsed')}</span>
                      <span>{t('contests.remaining')}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span>{formatTimeRemaining(Math.min(elapsed, durationSeconds))}</span>
                      <span>{remaining > 0 ? formatTimeRemaining(remaining) : t('contests.finished')}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t('contests.registration')}</dt>
                  <dd className="font-medium text-xs">{getRegModeLabel(contest.options)}</dd>
                </div>

                {/* Registration status / action */}
                {user && (
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <dt className="text-muted-foreground">{t('contests.yourStatus')}</dt>
                    <dd>
                      {userRegistered ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="size-3" />
                          {t('contests.registered')}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => registerMutation.mutate()}
                          disabled={registerMutation.isPending}
                          className="h-7 text-xs gap-1"
                        >
                          {registerMutation.isPending ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <UserPlus className="size-3" />
                          )}
                          {registerMutation.isPending ? t('contests.registering') : t('contests.registerForContest')}
                        </Button>
                      )}
                    </dd>
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
