'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { VerdictBadge } from '@/components/verdict-badge';
import type { Solution } from '@/types';

export default function SolutionsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['solutions', page],
    queryFn: async () => {
      const res = await api.get('/api/v1/solutions', { params: { page, per_page: 25 } });
      return res.data;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Please sign in to view your solutions.</p>
        <Link href="/login" className="text-blue-600 hover:underline">Sign In</Link>
      </div>
    );
  }

  const solutions: Solution[] = data?.solutions ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 25;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">My Solutions</h1>

      {isLoading ? (
        <Spinner />
      ) : solutions.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No solutions found.</p>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Language</TableHead>
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
                      <Link href={`/problems/${s.problem_id}`} className="text-blue-600 hover:underline">
                        {s.problem_title || s.problem_id}
                      </Link>
                    </TableCell>
                    <TableCell>{s.language_name || s.language_id}</TableCell>
                    <TableCell>
                      <VerdictBadge result={s.test_result} />
                    </TableCell>
                    <TableCell className="text-right">{s.test_score}</TableCell>
                    <TableCell className="text-gray-500">{formatDateTime(s.posted_time)}</TableCell>
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
