'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';

interface LogEntry {
  log_id: number;
  user_id: number;
  action: string;
  details: string;
  ip: string;
  time: number;
  nickname?: string;
}

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/logs', { params: { page, per_page: 50 } });
      return res.data;
    },
  });

  const logs: LogEntry[] = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">System Logs</h1>

      {isLoading ? (
        <Spinner />
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">No logs found.</p>
      ) : (
        <>
          <Card>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.log_id} className="flex items-start gap-4 py-2 border-b border-border last:border-0 text-sm">
                    <span className="text-muted-foreground/70 whitespace-nowrap">{formatDateTime(log.time)}</span>
                    <span className="text-muted-foreground font-mono">{log.nickname || log.user_id}</span>
                    <span className="font-medium text-foreground">{log.action}</span>
                    <span className="text-muted-foreground flex-1">{log.details}</span>
                    <span className="text-muted-foreground/70 font-mono text-xs">{log.ip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
