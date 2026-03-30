'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { cn, formatDateTime, formatDuration, verdictCode, verdictColor } from '@/lib/utils';
import { decodeVerdictFull } from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { CodeEditor, getMonacoLanguage } from '@/components/code-editor';
import { VerdictBadge } from '@/components/verdict-badge';
import { FileCode, ArrowLeft, Code, Clock, Hash, Globe, Loader2 } from 'lucide-react';
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

function SourceCodeViewer({ solutionId, language, t }: { solutionId: number; language: string; t: (k: string) => string }) {
  const [expanded, setExpanded] = React.useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['solution-source', solutionId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/solutions/${solutionId}/source`, { responseType: 'text' });
      return typeof res.data === 'string' ? res.data : '';
    },
    enabled: expanded,
    retry: false,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="size-4" />
            {t('solutions.sourceCode')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? t('common.hide') : t('common.show')}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full rounded-lg" />
          ) : data ? (
            <CodeEditor value={data} language={getMonacoLanguage(language)} readOnly height="400px" />
          ) : (
            <p className="text-sm text-muted-foreground">{t('solutions.sourceUnavailable')}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ContestSolutionDetailPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const solutionId = params.solutionId as string;
  const { user } = useAuth();
  const { t } = useTranslation();

  const isPending = (s: Solution) => s.test_result < 0;

  const { data, isLoading } = useQuery({
    queryKey: ['solution', solutionId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/solutions/${solutionId}`);
      return res.data;
    },
    enabled: !!user,
    // Auto-refresh while pending testing
    refetchInterval: (query) => {
      const sol = query.state.data?.solution;
      return sol && sol.test_result < 0 ? 3000 : false;
    },
  });

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t('auth.signInRequired')}</p>
        <Link href="/login" className="text-primary hover:underline">{t('auth.signIn')}</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const solution: Solution | undefined = data?.solution;
  const tests: TestResult[] = data?.tests ?? [];
  const language: string = data?.language || '';
  const problemTitle: string = data?.problem_title || '';
  const shortName: string = data?.short_name || '';

  if (!solution) {
    return <p className="text-center py-8 text-muted-foreground">{t('solutions.notFound')}</p>;
  }

  const pending = isPending(solution);
  const hasResult = !pending && solution.test_result >= 0;
  const isOk = solution.test_result === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/contests/${contestId}/solutions`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="size-3.5" />
          {t('solutions.backToSolutions')}
        </Link>
        <Link href={`/contests/${contestId}/submit?problem=${solution.problem_id}&lang=${solution.lang_id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
          <FileCode className="size-3.5" />
          {t('solutions.submitAnother')}
        </Link>
      </div>

      {/* Main card: result + metadata unified */}
      <Card>
        <CardContent className="pt-6">
          {/* Result banner */}
          <div className={cn(
            'rounded-lg px-5 py-4 mb-6',
            pending ? 'bg-blue-500/5 border border-blue-500/20' :
            isOk ? 'bg-green-500/5 border border-green-500/20' :
            'bg-destructive/5 border border-destructive/20'
          )}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {pending ? (
                  <>
                    <Loader2 className="size-5 text-blue-500 animate-spin" />
                    <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                      {t('solutions.pendingTesting')}
                    </span>
                  </>
                ) : (
                  <>
                    <VerdictBadge result={solution.test_result} full />
                    <span className="text-2xl font-bold">{solution.test_score}</span>
                    <span className="text-muted-foreground text-sm">{t('solutions.points')}</span>
                  </>
                )}
              </div>
              {pending && (
                <span className="text-xs text-muted-foreground">{t('solutions.autoRefresh')}</span>
              )}
            </div>
          </div>

          {/* Solution metadata — clean 2×2 grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Problem */}
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2 shrink-0">
                <FileCode className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('solutions.tableProblem')}</p>
                <Link href={`/contests/${contestId}/problems/${solution.problem_id}`} className="text-sm font-medium text-primary hover:underline truncate block">
                  {shortName ? `${shortName}: ` : ''}{problemTitle || `#${solution.problem_id}`}
                </Link>
              </div>
            </div>

            {/* Submission time */}
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2 shrink-0">
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('solutions.submitted')}</p>
                <Tooltip>
                  <TooltipTrigger className="text-sm font-medium text-left">
                    {solution.contest_time > 0 ? formatDuration(solution.contest_time) : formatDateTime(solution.posted_time)}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs space-y-1">
                    <p>{t('solutions.submitted')}: {formatDateTime(solution.posted_time)}</p>
                    <p>{t('solutions.checked')}: {solution.checked_time ? formatDateTime(solution.checked_time) : t('solutions.pendingTesting')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Language */}
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2 shrink-0">
                <Globe className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('solutions.tableLanguage')}</p>
                <p className="text-sm font-medium">{language || `ID: ${solution.lang_id}`}</p>
              </div>
            </div>

            {/* Checksum */}
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2 shrink-0">
                <Hash className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">MD5</p>
                <p className="text-sm font-mono text-muted-foreground truncate">{solution.checksum || '—'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source code */}
      <SourceCodeViewer solutionId={solution.solution_id} language={language} t={t} />

      {/* Compile error */}
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

      {/* Test results */}
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
                    <TableHead>{t('solutions.testNumber')}</TableHead>
                    <TableHead>{t('solutions.tableResult')}</TableHead>
                    <TableHead className="text-right">{t('solutions.tableScore')}</TableHead>
                    <TableHead className="text-right">{t('solutions.time')}</TableHead>
                    <TableHead className="text-right">{t('solutions.memory')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((te) => {
                    const code = verdictCode(te.test_result);
                    const color = verdictColor(code);
                    const timeSec = te.test_time ? (te.test_time / 1000).toFixed(3) : '0.000';
                    const memKb = te.test_mem ? `${(te.test_mem / 1024).toFixed(1)}k` : '-';
                    return (
                      <TableRow key={te.test_no} className={testRowBg(code)}>
                        <TableCell>{te.test_no}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${color}`}>
                            {t('verdicts.' + code)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{te.test_score}</TableCell>
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
