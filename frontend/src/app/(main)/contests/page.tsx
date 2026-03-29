'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import type { Contest } from '@/types';

function ContestTableSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ContestsPage() {
  const [page, setPage] = useState(1);
  const { t } = useTranslation();

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

  function statusBadge(status: string) {
    switch (status) {
      case 'going':
        return <Badge className="bg-green-600 text-white border-transparent">{t('status.Going')}</Badge>;
      case 'finished':
        return <Badge variant="secondary">{t('status.Finished')}</Badge>;
      case 'wait':
        return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30">{t('status.Wait')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{t('contests.title')}</h1>

      {isLoading ? (
        <ContestTableSkeleton />
      ) : contests.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">🏆</div>
          <p className="text-muted-foreground text-lg">{t('contests.noContests')}</p>
          <p className="text-muted-foreground text-sm">{t('contests.checkBackLater')}</p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
            <div className="overflow-x-auto relative">
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden z-10" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('contests.tableTitle')}</TableHead>
                    <TableHead>{t('contests.tableType')}</TableHead>
                    <TableHead>{t('contests.tableStartTime')}</TableHead>
                    <TableHead>{t('contests.tableStatus')}</TableHead>
                    <TableHead className="text-right">{t('contests.tableParticipants')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contests.map((c) => (
                    <TableRow key={c.contest_id}>
                      <TableCell>
                        <Link href={`/contests/${c.contest_id}`} className="text-primary hover:underline font-medium">
                          {c.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {t('contestType.' + c.contest_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(c.start_time)}</TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-right">{c.user_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
