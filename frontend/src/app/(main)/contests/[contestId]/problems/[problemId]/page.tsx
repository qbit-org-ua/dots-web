'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';
import { parseProblemDescription } from '@/lib/parse-problem';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCode } from 'lucide-react';
import type { Problem } from '@/types';

export default function ContestProblemDetailPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const problemId = params.problemId as string;
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['problem', problemId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/problems/${problemId}`);
      return res.data;
    },
  });

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
        <Skeleton className="h-96 w-full rounded-lg" />
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

  // Problem must belong to this contest
  if (cpData && !cp) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🔍</div>
        <p className="text-muted-foreground text-lg">{t('problems.notFound')}</p>
      </div>
    );
  }

  const renderedDescription = parseProblemDescription(
    problem.description,
    problem.problem_id,
    problem.attachment || null,
  );

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
          {renderedDescription ? (
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedDescription }}
            />
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">{t('problems.noDescription')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
