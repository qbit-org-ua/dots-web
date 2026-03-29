'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { VerdictBadge } from '@/components/verdict-badge';
import type { Solution } from '@/types';

export default function ContestSolutionsPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const { user } = useAuth();

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
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Please sign in to view solutions.</p>
        <Link href="/login" className="text-blue-600 hover:underline">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <Spinner />
      ) : solutions.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No solutions submitted yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>Solution</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Posted</TableHead>
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
                    {s.short_name ? `${s.short_name}. ` : ''}
                    {s.problem_title || `Problem #${s.problem_id}`}
                  </TableCell>
                  <TableCell className="text-gray-600 text-xs font-mono">
                    {s.filename || '-'}
                  </TableCell>
                  <TableCell>
                    <VerdictBadge result={s.test_result} />
                  </TableCell>
                  <TableCell className="text-right">{s.test_score}</TableCell>
                  <TableCell>{formatDateTime(s.posted_time)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
