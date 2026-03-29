'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime, formatDuration, verdictCode, verdictColor } from '@/lib/utils';
import { decodeVerdictFull } from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileCode, ExternalLink, ArrowLeft } from 'lucide-react';
import type { Solution, TestResult } from '@/types';

function testRowBg(code: string): string {
  switch (code) {
    case 'OK': return 'bg-green-500/5';
    case 'WA': return 'bg-red-500/5';
    case 'TL': case 'ML': return 'bg-orange-500/5';
    case 'RE': return 'bg-purple-500/5';
    case 'CE': return 'bg-yellow-500/5';
    default: return '';
  }
}

function SolutionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

export default function SolutionDetailPage() {
  const params = useParams();
  const solutionId = params.solutionId as string;
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['solution', solutionId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/solutions/${solutionId}`);
      return res.data;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🔒</div>
        <p className="text-muted-foreground text-lg">{t('auth.signInRequired')}</p>
        <p className="text-muted-foreground text-sm">{t('auth.pleaseSignInView')}</p>
        <Link href="/login" className="inline-block mt-2 text-sm text-primary hover:underline">{t('auth.signIn')}</Link>
      </div>
    );
  }

  if (isLoading) return <SolutionDetailSkeleton />;

  const solution: Solution | undefined = data?.solution;
  const tests: TestResult[] = data?.tests ?? [];
  const language: string = data?.language || '';
  const problemTitle: string = data?.problem_title || '';
  const shortName: string = data?.short_name || '';
  const nickname: string = data?.nickname || '';

  if (!solution) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🔍</div>
        <p className="text-muted-foreground text-lg">{t('solutions.notFound')}</p>
        <p className="text-muted-foreground text-sm">{t('solutions.notFoundDesc')}</p>
      </div>
    );
  }

  const verdictStr = decodeVerdictFull(solution.test_result);
  const overallCode = verdictCode(solution.test_result);
  const overallColor = verdictColor(overallCode);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Solution #{solution.solution_id}</h1>
        <Link href={solution.contest_id ? `/contests/${solution.contest_id}/solutions` : '/solutions'} className="text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="size-3.5" />
          {t('solutions.backToSolutions')}
        </Link>
      </div>

      {/* Result highlight */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-card ring-1 ring-border">
        <span className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-bold ${overallColor}`}>
          {verdictStr}
        </span>
        <div className="text-2xl font-bold">{solution.test_score}</div>
        <span className="text-muted-foreground text-sm">{t('solutions.points')}</span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('solutions.solutionInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">{t('solutions.solutionId')}</dt>
              <dd className="font-mono">{solution.solution_id}-{solution.problem_id}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">{t('solutions.problem')}</dt>
              <dd>
                <Link href={`/problems/${solution.problem_id}`} className="text-primary hover:underline font-medium">
                  {shortName ? `${shortName}: ` : ''}{problemTitle || `#${solution.problem_id}`}
                </Link>
              </dd>
            </div>
            {nickname && (
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">{t('solutions.author')}</dt>
                <dd>
                  <Link href={`/users/${solution.user_id}`} className="text-primary hover:underline">{nickname}</Link>
                </dd>
              </div>
            )}
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">{t('solutions.filename')}</dt>
              <dd className="font-mono text-xs">{solution.filename || t('solutions.fromEditor')}</dd>
            </div>
            {solution.checksum && (
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">MD5</dt>
                <dd className="font-mono text-xs">{solution.checksum}</dd>
              </div>
            )}
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">{t('solutions.language')}</dt>
              <dd className="font-medium">{language || `ID: ${solution.lang_id}`}</dd>
            </div>
            {solution.contest_time > 0 && (
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">{t('solutions.contestTime')}</dt>
                <dd>{formatDuration(solution.contest_time)}</dd>
              </div>
            )}
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">{t('solutions.submitted')}</dt>
              <dd>{formatDateTime(solution.posted_time)}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">{t('solutions.checked')}</dt>
              <dd>{solution.checked_time ? formatDateTime(solution.checked_time) : '-'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href={solution.contest_id
            ? `/contests/${solution.contest_id}/solutions?problem_id=${solution.problem_id}`
            : `/solutions?problem_id=${solution.problem_id}`}
          className="text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink className="size-3.5" />
          {t('solutions.allForProblem')}
        </Link>
        {solution.contest_id && (
          <Link href={`/contests/${solution.contest_id}/submit`} className="text-primary hover:underline flex items-center gap-1">
            <FileCode className="size-3.5" />
            {t('solutions.submitAnother')}
          </Link>
        )}
      </div>

      {solution.compile_error && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">{t('solutions.compilationError')}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-red-700 dark:text-red-400 bg-red-500/10 p-4 rounded overflow-x-auto font-mono whitespace-pre-wrap">
              {solution.compile_error}
            </pre>
          </CardContent>
        </Card>
      )}

      {tests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('solutions.testResults')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto relative">
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden z-10" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('solutions.testNo')}</TableHead>
                    <TableHead>{t('solutions.testResult')}</TableHead>
                    <TableHead className="text-right">{t('solutions.testScore')}</TableHead>
                    <TableHead className="text-right">{t('solutions.testTime')}</TableHead>
                    <TableHead className="text-right">{t('solutions.testMemory')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((tt) => {
                    const code = verdictCode(tt.test_result);
                    const color = verdictColor(code);
                    const timeSec = tt.test_time ? (tt.test_time / 1000).toFixed(3) : '0.000';
                    const memKb = tt.test_mem ? `${(tt.test_mem / 1024).toFixed(1)}k` : '-';
                    return (
                      <TableRow key={tt.test_no} className={testRowBg(code)}>
                        <TableCell className="font-medium">{tt.test_no}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${color}`}>
                            {t('verdicts.' + code)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{tt.test_score}</TableCell>
                        <TableCell className="text-right font-mono">{timeSec}</TableCell>
                        <TableCell className="text-right font-mono">{memKb}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
