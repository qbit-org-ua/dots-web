'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Users } from 'lucide-react';
import type { ContestParticipant } from '@/types';

const REG_STATUS_MAP: Record<number, string> = {
  0: 'Not registered',
  1: 'Confirming',
  2: 'Failed',
  3: 'OK',
};

function ParticipantsTableSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">ID</TableHead>
            <TableHead>Login - Full Name</TableHead>
            <TableHead>Institution</TableHead>
            <TableHead className="w-40">Registration Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-10" /></TableCell>
              <TableCell><Skeleton className="h-4 w-40" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ContestParticipantsPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contest-users', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}/users`);
      return res.data;
    },
  });

  const users: ContestParticipant[] = data?.users ?? [];

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase();
        return (
          u.nickname.toLowerCase().includes(q) ||
          u.fio.toLowerCase().includes(q)
        );
      })
    : users;

  return (
    <div className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="Search by nickname or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <ParticipantsTableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Users className="size-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">
            {users.length === 0 ? 'No participants yet' : 'No matching participants'}
          </p>
          <p className="text-muted-foreground text-sm">
            {users.length === 0
              ? 'Participants will appear here once they register for this contest.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
          <div className="overflow-x-auto relative">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden z-10" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Login - Full Name</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="w-40">Registration Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-mono text-muted-foreground">{u.user_id}</TableCell>
                    <TableCell>
                      <span className="font-medium">{u.nickname}</span>
                      {u.fio && <span className="text-muted-foreground"> - {u.fio}</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.u_institution_name || '-'}</TableCell>
                    <TableCell>
                      <span
                        className={
                          u.reg_status === 3
                            ? 'text-green-600 dark:text-green-400'
                            : u.reg_status === 2
                            ? 'text-red-600 dark:text-red-400'
                            : u.reg_status === 1
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-muted-foreground'
                        }
                      >
                        {REG_STATUS_MAP[u.reg_status] ?? `Unknown (${u.reg_status})`}
                      </span>
                    </TableCell>
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
