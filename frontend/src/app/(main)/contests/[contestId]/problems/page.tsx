'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { VerdictBadge } from '@/components/verdict-badge';
import { BookOpen } from 'lucide-react';
import type { ContestProblem } from '@/types';

function ProblemsTableSkeleton() {
  return (
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
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
              <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto rounded" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

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
        <ProblemsTableSkeleton />
      ) : problems.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <BookOpen className="size-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">No problems available</p>
          <p className="text-muted-foreground text-sm">Problems will appear here once the contest begins or they are published.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
          <div className="overflow-x-auto relative">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden z-10" />
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
                      <Link href={`/problems/${p.problem_id}?contest_id=${contestId}`} className="text-primary hover:underline font-medium">
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
        </div>
      )}
    </div>
  );
}
