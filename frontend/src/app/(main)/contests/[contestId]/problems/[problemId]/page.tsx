'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCode, Download } from 'lucide-react';
import type { Problem } from '@/types';

function cleanDescription(html: string): string {
  let cleaned = html.replace(/^#problem\s*/i, '');
  cleaned = cleaned.replace(/<attachment[^>]*>(.*?)<\/attachment>/gi, '');
  return cleaned;
}

export default function ContestProblemDetailPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const problemId = params.problemId as string;
  const { t } = useTranslation();

  // Fetch problem detail
  const { data, isLoading } = useQuery({
    queryKey: ['problem', problemId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/problems/${problemId}`);
      return res.data;
    },
  });

  // Fetch contest problems to get short_name
  const { data: cpData } = useQuery({
    queryKey: ['contest-problems', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}/problems`);
      return res.data;
    },
  });

  const problem: Problem | undefined = data?.problem;
  const contestProblems = cpData?.problems ?? [];
  const cp = contestProblems.find((p: { problem_id: number }) => String(p.problem_id) === problemId);
  const shortName = cp?.short_name || '';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🔍</div>
        <p className="text-muted-foreground text-lg">{t('problems.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {shortName && <span className="text-muted-foreground mr-2">{shortName}.</span>}
            {problem.title}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            {problem.complexity > 0 && (
              <Badge variant="outline">{t('problems.difficulty')}: {problem.complexity}</Badge>
            )}
            <span>{t('problems.posted')}: {formatDate(problem.posted_time)}</span>
          </div>
        </div>
        <Link href={`/contests/${contestId}/submit?problem=${problemId}`}>
          <Button size="sm" className="gap-1.5">
            <FileCode className="size-3.5" />
            {t('problems.submitSolution')}
          </Button>
        </Link>
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
