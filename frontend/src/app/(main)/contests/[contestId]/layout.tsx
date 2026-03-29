'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Going: 'default',
  Finished: 'secondary',
  Wait: 'outline',
  GoingFrozen: 'outline',
  FinishedFrozen: 'secondary',
};

interface ContestTab {
  name: string;
  labelKey: string;
  href: string;
}

function buildTabs(contestId: string): ContestTab[] {
  return [
    { name: 'info', labelKey: 'contestTabs.info', href: `/contests/${contestId}` },
    { name: 'participants', labelKey: 'contestTabs.participants', href: `/contests/${contestId}/participants` },
    { name: 'problems', labelKey: 'contestTabs.problems', href: `/contests/${contestId}/problems` },
    { name: 'submit', labelKey: 'contestTabs.submit', href: `/contests/${contestId}/submit` },
    { name: 'solutions', labelKey: 'contestTabs.solutions', href: `/contests/${contestId}/solutions` },
    { name: 'standings', labelKey: 'contestTabs.standings', href: `/contests/${contestId}/standings` },
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
  const { t } = useTranslation();

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
      <div className="bg-card border-b border-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6">
        {/* Breadcrumb + contest info */}
        <div className="py-3">
          <nav className="flex items-center text-sm text-muted-foreground mb-1">
            <span className="text-foreground font-medium truncate max-w-md">
              {isLoading ? '...' : contest?.title || `Contest #${contestId}`}
            </span>
            <svg className="w-4 h-4 mx-1 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {status && (
              <Badge variant={STATUS_BADGE_VARIANT[status] || 'secondary'}>{t('status.' + status)}</Badge>
            )}
          </nav>
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
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {t(tab.labelKey)}
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
