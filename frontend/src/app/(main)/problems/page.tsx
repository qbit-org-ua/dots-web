'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import type { Problem } from '@/types';

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
        <h1 className="text-2xl font-bold text-gray-900">Problem Archive</h1>
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
        <Spinner />
      ) : problems.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No problems found.</p>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                    <TableCell className="text-gray-500">{p.problem_id}</TableCell>
                    <TableCell>
                      <Link href={`/problems/${p.problem_id}`} className="text-blue-600 hover:underline font-medium">
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.complexity > 0 ? (
                        <span className="text-gray-600">{p.complexity}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
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
