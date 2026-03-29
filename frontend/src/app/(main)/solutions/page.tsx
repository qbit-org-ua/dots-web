'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { VerdictBadge } from '@/components/verdict-badge';
import { FileCode } from 'lucide-react';
import type { Solution } from '@/types';

function SolutionsTableSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function SolutionsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const problemId = searchParams.get('problem_id');

  const { data, isLoading } = useQuery({
    queryKey: ['solutions', page, problemId],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 25, user_id: user!.user_id };
      if (problemId) params.problem_id = problemId;
      const res = await api.get('/api/v1/solutions', { params });
      return res.data;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🔒</div>
        <p className="text-muted-foreground text-lg">{t('auth.signInRequired')}</p>
        <p className="text-muted-foreground text-sm">{t('auth.pleaseSignInSolutions')}</p>
        <Link href="/login" className="inline-block mt-2 text-sm text-primary hover:underline">{t('auth.signIn')}</Link>
      </div>
    );
  }

  const solutions: Solution[] = data?.solutions ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 25;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{t('solutions.title')}</h1>

      {isLoading ? (
        <SolutionsTableSkeleton />
      ) : solutions.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <FileCode className="size-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">{t('solutions.noSolutions')}</p>
          <p className="text-muted-foreground text-sm">
            {problemId
              ? t('solutions.noSolutionsProblem')
              : t('solutions.noSolutionsGeneral')}
          </p>
          <Link href="/contests" className="inline-block mt-2 text-sm text-primary hover:underline">
            {t('solutions.browseContests')}
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
            <div className="overflow-x-auto relative">
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden z-10" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t('solutions.tableProblem')}</TableHead>
                    <TableHead>{t('solutions.tableLanguage')}</TableHead>
                    <TableHead>{t('solutions.tableResult')}</TableHead>
                    <TableHead className="text-right">{t('solutions.tableScore')}</TableHead>
                    <TableHead>{t('solutions.tableTime')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solutions.map((s) => (
                    <TableRow key={s.solution_id}>
                      <TableCell>
                        <Link href={`/solutions/${s.solution_id}`} className="text-primary hover:underline">
                          {s.solution_id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/problems/${s.problem_id}`} className="text-primary hover:underline">
                          {s.problem_title || s.problem_id}
                        </Link>
                      </TableCell>
                      <TableCell>{s.language_name || s.language_id}</TableCell>
                      <TableCell>
                        <VerdictBadge result={s.test_result} full />
                      </TableCell>
                      <TableCell className="text-right">{s.test_score}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(s.posted_time)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
