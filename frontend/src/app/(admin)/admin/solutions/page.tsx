'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { VerdictBadge } from '@/components/verdict-badge';
import type { Solution } from '@/types';

export default function AdminSolutionsPage() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [contestId, setContestId] = useState('');
  const [problemId, setProblemId] = useState('');

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

  const solutions: Solution[] = data?.solutions ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 25;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">All Solutions</h1>

      <div className="flex gap-4 flex-wrap">
        <div className="w-40">
          <Input
            label="User ID"
            type="text"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1); }}
            placeholder="Filter by user"
          />
        </div>
        <div className="w-40">
          <Input
            label="Contest ID"
            type="text"
            value={contestId}
            onChange={(e) => { setContestId(e.target.value); setPage(1); }}
            placeholder="Filter by contest"
          />
        </div>
        <div className="w-40">
          <Input
            label="Problem ID"
            type="text"
            value={problemId}
            onChange={(e) => { setProblemId(e.target.value); setPage(1); }}
            placeholder="Filter by problem"
          />
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : solutions.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No solutions found.</p>
      ) : (
        <>
          <p className="text-sm text-gray-500">{total} solutions total</p>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Contest</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solutions.map((s) => (
                  <TableRow key={s.solution_id}>
                    <TableCell>
                      <Link href={`/solutions/${s.solution_id}`} className="text-blue-600 hover:underline">
                        {s.solution_id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/users/${s.user_id}`} className="text-blue-600 hover:underline">
                        {s.user_id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/problems/${s.problem_id}`} className="text-blue-600 hover:underline">
                        {s.problem_id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {s.contest_id ? (
                        <Link href={`/contests/${s.contest_id}`} className="text-blue-600 hover:underline">
                          {s.contest_id}
                        </Link>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <VerdictBadge result={s.test_result} />
                    </TableCell>
                    <TableCell className="text-right">{s.test_score}</TableCell>
                    <TableCell className="text-gray-500 text-xs">{formatDateTime(s.posted_time)}</TableCell>
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
