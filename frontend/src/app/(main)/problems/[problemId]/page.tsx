'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCode, Download, ArrowLeft } from 'lucide-react';
import type { Problem } from '@/types';

function cleanDescription(html: string): string {
  let cleaned = html.replace(/^#problem\s*/i, '');
  cleaned = cleaned.replace(/<attachment[^>]*>(.*?)<\/attachment>/gi, '');
  return cleaned;
}

function ProblemDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export default function ProblemDetailPage() {
  const params = useParams();
  const problemId = params.problemId as string;
  const { user } = useAuth();
  const { t } = useTranslation();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const contestId = searchParams.get('contest_id');

  // Standalone problem view requires ACCESS_WRITE_PROBLEMS (0x0100)
  if (!user || !(user.access & 0x0100)) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🔒</div>
        <p className="text-muted-foreground text-lg">{t('common.accessDenied')}</p>
      </div>
    );
  }

  const { data, isLoading } = useQuery({
    queryKey: ['problem', problemId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/problems/${problemId}`);
      return res.data;
    },
  });

  if (isLoading) return <ProblemDetailSkeleton />;

  const problem: Problem = data?.problem;
  if (!problem) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🔍</div>
        <p className="text-muted-foreground text-lg">{t('problems.notFound')}</p>
        <p className="text-muted-foreground text-sm">{t('problems.notFoundDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{problem.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span>Problem #{problem.problem_id}</span>
            {problem.complexity > 0 && (
              <Badge variant="outline">{t('problems.difficulty')}: {problem.complexity}</Badge>
            )}
            <span>{t('problems.posted')}: {formatDate(problem.posted_time)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {contestId && (
            <Link href={`/contests/${contestId}/submit`}>
              <Button size="sm" className="gap-1.5">
                <FileCode className="size-3.5" />
                {t('problems.submitSolution')}
              </Button>
            </Link>
          )}
          <Link href="/problems" className="text-sm text-primary hover:underline flex items-center gap-1">
            <ArrowLeft className="size-3.5" />
            {t('problems.backToArchive')}
          </Link>
        </div>
      </div>

      <Card>
        <CardContent>
          {problem.description ? (
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: cleanDescription(problem.description) }}
            />
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">{t('problems.noDescription')}</p>
              {problem.attachment && (
                <p className="text-muted-foreground text-sm">{t('problems.checkAttachment')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {problem.attachment && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('problems.attachments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={`/api/v1/problems/${problem.problem_id}/attachment`}
              className="text-primary hover:underline flex items-center gap-2"
              download
            >
              <Download className="size-4" />
              {t('problems.downloadAttachment')}
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
