'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { VerdictBadge } from '@/components/verdict-badge';
import type { ContestProblem } from '@/types';

export default function ContestProblemsPage() {
  const params = useParams();
  const contestId = params.contestId as string;

  const { data, isLoading } = useQuery({
    queryKey: ['contest-problems', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}/problems`);
      return res.data;
    },
  });

  const problems: ContestProblem[] = data?.problems ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <Spinner />
      ) : problems.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">No problems available.</p>
      ) : (
        <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-center w-28">Complexity</TableHead>
                <TableHead className="text-center w-32">Result</TableHead>
                <TableHead className="text-right w-28">Score</TableHead>
                <TableHead className="text-right w-28">Max Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {problems.map((p) => (
                <TableRow key={p.problem_id}>
                  <TableCell className="font-mono font-bold text-muted-foreground">{p.short_name}</TableCell>
                  <TableCell>
                    <Link href={`/problems/${p.problem_id}`} className="text-primary hover:underline font-medium">
                      {p.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{p.complexity ?? '-'}</TableCell>
                  <TableCell className="text-center">
                    {p.user_result != null ? (
                      <VerdictBadge result={p.user_result} />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.user_score != null ? p.user_score : '-'}
                  </TableCell>
                  <TableCell className="text-right">{p.max_score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
