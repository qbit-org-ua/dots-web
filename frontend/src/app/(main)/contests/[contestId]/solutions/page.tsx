'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { VerdictBadge } from '@/components/verdict-badge';
import { FileCode } from 'lucide-react';
import type { Solution } from '@/types';

function SolutionsTableSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-4 w-8" /></TableHead>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableHead>
            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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

export default function ContestSolutionsPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['contest-solutions', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}/solutions`);
      return res.data;
    },
    enabled: !!user,
  });

  const solutions: Solution[] = data?.solutions ?? [];

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

  return (
    <div className="space-y-4">
      {isLoading ? (
        <SolutionsTableSkeleton />
      ) : solutions.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <FileCode className="size-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">{t('solutions.noSolutions')}</p>
          <p className="text-muted-foreground text-sm">{t('solutions.submitFirst')}</p>
          <Link href={`/contests/${contestId}/submit`}>
            <Button size="sm" className="mt-2 gap-1.5">
              <FileCode className="size-3.5" />
              {t('solutions.submitSolution')}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
          <div className="overflow-x-auto relative">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden z-10" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('solutions.tableId')}</TableHead>
                  <TableHead>{t('solutions.tableProblem')}</TableHead>
                  <TableHead>{t('solutions.tableSolution')}</TableHead>
                  <TableHead>{t('solutions.tableResult')}</TableHead>
                  <TableHead className="text-right">{t('solutions.tableScore')}</TableHead>
                  <TableHead>{t('solutions.tablePosted')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solutions.map((s) => (
                  <TableRow key={s.solution_id}>
                    <TableCell>
                      <Link href={`/contests/${contestId}/solutions/${s.solution_id}`} className="text-primary hover:underline">
                        {s.solution_id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {s.short_name ? `${s.short_name}. ` : ''}
                      {s.problem_title || `Problem #${s.problem_id}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {s.filename || '-'}
                    </TableCell>
                    <TableCell>
                      <VerdictBadge result={s.test_result} full />
                    </TableCell>
                    <TableCell className="text-right">{s.test_score}</TableCell>
                    <TableCell>{formatDateTime(s.posted_time)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
