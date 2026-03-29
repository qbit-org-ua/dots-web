'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { CONTEST_TYPES } from '@/lib/constants';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';

const STATUS_BADGE: Record<string, string> = {
  Going: 'success',
  Finished: 'neutral',
  Wait: 'warning',
  GoingFrozen: 'info',
  FinishedFrozen: 'neutral',
};

interface ContestTab {
  name: string;
  label: string;
  href: string;
}

function buildTabs(contestId: string): ContestTab[] {
  return [
    { name: 'info', label: 'Info', href: `/contests/${contestId}` },
    { name: 'participants', label: 'Participants', href: `/contests/${contestId}/participants` },
    { name: 'problems', label: 'Problems', href: `/contests/${contestId}/problems` },
    { name: 'submit', label: 'Submit', href: `/contests/${contestId}/submit` },
    { name: 'solutions', label: 'Solutions', href: `/contests/${contestId}/solutions` },
    { name: 'standings', label: 'Standings', href: `/contests/${contestId}/standings` },
  ];
}

function activeTab(pathname: string, contestId: string): string {
  const suffix = pathname.replace(`/contests/${contestId}`, '');
  if (suffix === '' || suffix === '/') return 'info';
  const part = suffix.split('/')[1];
  return part || 'info';
}

export default function ContestLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const contestId = params.contestId as string;

  const { data, isLoading } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}`);
      return res.data;
    },
    staleTime: 30_000,
  });

  const contest = data?.contest;
  const status = data?.status;
  const tabs = buildTabs(contestId);
  const current = activeTab(pathname, contestId);

  return (
    <div>
      {/* Contest context bar */}
      <div className="bg-white border-b border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6">
        {/* Breadcrumb + contest info */}
        <div className="py-3">
          <nav className="flex items-center text-sm text-gray-500 mb-1">
            <Link href="/contests" className="hover:text-blue-600">Contests</Link>
            <svg className="w-4 h-4 mx-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-700 font-medium truncate max-w-md">
              {isLoading ? '...' : contest?.title || `Contest #${contestId}`}
            </span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {isLoading ? <Spinner /> : contest?.title}
            </h1>
            {contest && (
              <>
                <span className="text-xs text-gray-400">
                  {CONTEST_TYPES[contest.contest_type] || contest.contest_type}
                </span>
                {status && (
                  <Badge color={(STATUS_BADGE[status] || 'neutral') as 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>{status}</Badge>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 overflow-x-auto -mb-px">
          {tabs.map((tab) => {
            const isActive = tab.name === current;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
