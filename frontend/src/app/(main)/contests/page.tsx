'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { CONTEST_TYPES, STATUS_COLORS } from '@/lib/constants';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import type { Contest } from '@/types';

export default function ContestsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['contests', page],
    queryFn: async () => {
      const res = await api.get('/api/v1/contests', { params: { page, per_page: 20 } });
      return res.data;
    },
  });

  const contests: Contest[] = data?.contests ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Contests</h1>

      {isLoading ? (
        <Spinner />
      ) : contests.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No contests found.</p>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Participants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contests.map((c) => (
                  <TableRow key={c.contest_id}>
                    <TableCell>
                      <Link href={`/contests/${c.contest_id}`} className="text-blue-600 hover:underline font-medium">
                        {c.title}
                      </Link>
                    </TableCell>
                    <TableCell>{CONTEST_TYPES[c.contest_type] || c.contest_type}</TableCell>
                    <TableCell>{formatDateTime(c.start_time)}</TableCell>
                    <TableCell>
                      <Badge color={(STATUS_COLORS[c.status] || 'neutral') as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>
                        {c.status === 'going' ? 'Going' : c.status === 'finished' ? 'Finished' : c.status === 'wait' ? 'Waiting' : c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{c.user_count}</TableCell>
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
