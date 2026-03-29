'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { cn, formatDateTime } from '@/lib/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { VerdictBadge } from '@/components/verdict-badge';
import { FormInput } from '@/components/ui/form-field';

interface AdminSolution {
  solution_id: number;
  problem_id: number;
  user_id: number;
  contest_id: number | null;
  test_result: number;
  test_score: string;
  posted_time: number;
  nickname?: string;
  fio?: string;
  problem_title?: string;
  contest_title?: string;
}

export default function AdminSolutionsPage() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [contestId, setContestId] = useState('');
  const [problemId, setProblemId] = useState('');
  const { t } = useTranslation();

  const params: Record<string, string | number> = { page, per_page: 25 };
  if (userId) params.user_id = userId;
  if (contestId) params.contest_id = contestId;
  if (problemId) params.problem_id = problemId;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-solutions', page, userId, contestId, problemId],
    queryFn: async () => {
      const res = await api.get('/api/v1/solutions', { params });
      return res.data;
    },
  });

  const solutions: AdminSolution[] = data?.solutions ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 25;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{t('admin.allSolutions')}</h1>

      <div className="flex gap-4 flex-wrap">
        <div className="w-40">
          <FormInput
            label="User ID"
            type="text"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1); }}
            placeholder={t('admin.filterByUser')}
          />
        </div>
        <div className="w-40">
          <FormInput
            label="Contest ID"
            type="text"
            value={contestId}
            onChange={(e) => { setContestId(e.target.value); setPage(1); }}
            placeholder={t('admin.filterByContest')}
          />
        </div>
        <div className="w-40">
          <FormInput
            label="Problem ID"
            type="text"
            value={problemId}
            onChange={(e) => { setProblemId(e.target.value); setPage(1); }}
            placeholder={t('admin.filterByProblem')}
          />
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : solutions.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">{t('admin.noSolutions')}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{total} {t('admin.solutionsTotal')}</p>
          <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t('admin.tableUser')}</TableHead>
                  <TableHead>{t('solutions.tableProblem')}</TableHead>
                  <TableHead>{t('admin.tableContest')}</TableHead>
                  <TableHead className="text-right">{t('solutions.tableScore')}</TableHead>
                  <TableHead>{t('solutions.tableResult')}</TableHead>
                  <TableHead>{t('solutions.tableTime')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solutions.map((s) => (
                  <TableRow key={s.solution_id} className={cn(s.test_result === 0 && 'bg-green-500/5')}>
                    <TableCell>
                      <Link href={`/solutions/${s.solution_id}`} className="text-primary hover:underline font-mono text-xs">
                        {s.solution_id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/users/${s.user_id}`} className="text-primary hover:underline">
                        <span className="text-muted-foreground text-xs">#{s.user_id}</span>{' '}
                        <span className="font-medium">{s.nickname || '?'}</span>
                        {s.fio && <span className="text-muted-foreground text-xs"> — {s.fio}</span>}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/problems/${s.problem_id}`} className="text-primary hover:underline">
                        <span className="text-muted-foreground text-xs">#{s.problem_id}</span>{' '}
                        <span className="font-medium">{s.problem_title || '?'}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {s.contest_id ? (
                        <Link href={`/contests/${s.contest_id}`} className="text-primary hover:underline">
                          <span className="text-muted-foreground text-xs">#{s.contest_id}</span>{' '}
                          <span className="font-medium">{s.contest_title || '?'}</span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{s.test_score}</TableCell>
                    <TableCell>
                      <VerdictBadge result={s.test_result} full />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDateTime(s.posted_time)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
