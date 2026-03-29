'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { BookOpen } from 'lucide-react';
import type { Problem } from '@/types';

function ProblemsTableSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">#</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="text-right w-32">Complexity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-10" /></TableCell>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ProblemsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['problems', page, search],
    queryFn: async () => {
      const res = await api.get('/api/v1/problems', {
        params: { page, per_page: 25, search: search || undefined },
      });
      return res.data;
    },
  });

  const problems: Problem[] = data?.problems ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 25;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Problem Archive</h1>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search problems..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <ProblemsTableSkeleton />
      ) : problems.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <BookOpen className="size-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">No problems found</p>
          <p className="text-muted-foreground text-sm">
            {search ? 'Try a different search term.' : 'Problems will appear here once they are added to the archive.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right w-32">Complexity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {problems.map((p) => (
                  <TableRow key={p.problem_id}>
                    <TableCell className="text-muted-foreground">{p.problem_id}</TableCell>
                    <TableCell>
                      <Link href={`/problems/${p.problem_id}`} className="text-primary hover:underline font-medium">
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.complexity > 0 ? (
                        <span className="text-muted-foreground">{p.complexity}</span>
                      ) : (
                        <span className="text-muted-foreground/70">-</span>
                      )}
                    </TableCell>
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
