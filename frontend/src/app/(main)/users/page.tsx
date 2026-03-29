'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Users } from 'lucide-react';
import type { UserFull } from '@/types';

function UsersTableSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nickname</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Last Login</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: async () => {
      const res = await api.get('/api/v1/users', {
        params: { page, per_page: 25, search: search || undefined },
      });
      return res.data;
    },
  });

  const users: UserFull[] = data?.users ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 25;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <UsersTableSkeleton />
      ) : users.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Users className="size-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">No users found</p>
          <p className="text-muted-foreground text-sm">
            {search ? 'Try a different search term.' : 'No users are registered yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
            <div className="overflow-x-auto relative">
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden z-10" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nickname</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Last Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <Link href={`/users/${u.user_id}`} className="text-primary hover:underline font-medium">
                          {u.nickname}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {u.fio || '-'}
                      </TableCell>
                      <TableCell>{u.city_name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.lastlogin ? formatDateTime(u.lastlogin) : '-'}
                      </TableCell>
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
