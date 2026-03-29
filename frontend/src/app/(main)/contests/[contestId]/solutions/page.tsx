'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
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
            <TableHead>ID</TableHead>
            <TableHead>Problem</TableHead>
            <TableHead>Solution</TableHead>
            <TableHead>Result</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Posted</TableHead>
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
        <p className="text-muted-foreground text-lg">Sign in required</p>
        <p className="text-muted-foreground text-sm">Please sign in to view your contest solutions.</p>
        <Link href="/login" className="inline-block mt-2 text-sm text-primary hover:underline">Sign In</Link>
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
          <p className="text-muted-foreground text-lg">No solutions submitted yet</p>
          <p className="text-muted-foreground text-sm">Submit your first solution to see results here.</p>
          <Link href={`/contests/${contestId}/submit`}>
            <Button size="sm" className="mt-2 gap-1.5">
              <FileCode className="size-3.5" />
              Submit a solution
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
                      <Link href={`/solutions/${s.solution_id}`} className="text-primary hover:underline">
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
                      <VerdictBadge result={s.test_result} />
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
