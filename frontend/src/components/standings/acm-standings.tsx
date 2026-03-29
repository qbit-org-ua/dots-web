'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { StandingsData, ProblemScore } from '@/types';

function formatTime(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function RankCell({ place }: { place: number }) {
  if (place === 1) return <span className="text-lg" title="1st place">🥇</span>;
  if (place === 2) return <span className="text-lg" title="2nd place">🥈</span>;
  if (place === 3) return <span className="text-lg" title="3rd place">🥉</span>;
  return <span className="text-muted-foreground">{place}</span>;
}

export function AcmStandings({ data }: { data: StandingsData }) {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">{t('standings.rank')}</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('standings.team')}</th>
            {data.problems.map((p) => (
              <th key={p.problem_id} className="px-3 py-2 text-center font-medium text-muted-foreground min-w-[70px]" title={p.title}>
                {p.short_name}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-muted-foreground">{t('standings.solved')}</th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground">{t('standings.penalty')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.users.map((user) => (
            <tr key={user.user_id} className="hover:bg-muted/50">
              <td className="px-3 py-2 font-medium text-center">
                <RankCell place={user.place} />
              </td>
              <td className="px-3 py-2">
                <Link href={`/users/${user.user_id}`} className="text-primary hover:underline font-medium">
                  {user.nickname}
                </Link>
              </td>
              {user.scores.map((ps: ProblemScore, idx: number) => {
                const solved = ps.is_solved;
                const attempts = ps.attempts;
                return (
                  <td
                    key={idx}
                    className={cn(
                      'px-3 py-1 text-center text-xs',
                      solved ? 'bg-green-500/15' : attempts > 0 ? 'bg-red-500/10' : ''
                    )}
                  >
                    <Tooltip>
                      <TooltipTrigger className="cursor-default w-full">
                        {solved ? (
                          <div>
                            <div className={cn('font-bold', ps.is_first_solve ? 'text-green-700 dark:text-green-300' : 'text-green-600 dark:text-green-400')}>
                              +{attempts > 1 ? attempts - 1 : ''}
                            </div>
                            <div className="text-muted-foreground">{formatTime(ps.time)}</div>
                          </div>
                        ) : attempts > 0 ? (
                          <div className="font-bold text-red-600 dark:text-red-400">-{attempts}</div>
                        ) : null}
                      </TooltipTrigger>
                      {(solved || attempts > 0) && (
                        <TooltipContent>
                          {solved
                            ? `Solved in ${attempts} attempt${attempts > 1 ? 's' : ''} at ${formatTime(ps.time)}`
                            : `${attempts} failed attempt${attempts > 1 ? 's' : ''}`}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-bold">{user.total_solved}</td>
              <td className="px-3 py-2 text-center text-muted-foreground">{user.penalty}</td>
            </tr>
          ))}
        </tbody>
        {data.summary && data.summary.length > 0 && (
          <tfoot>
            <tr className="bg-muted/70 border-t-2 border-border text-xs font-medium text-muted-foreground">
              <td className="px-3 py-2" colSpan={2}>
                <span className="font-semibold">{t('standings.triedSolved')}</span>
              </td>
              {data.summary.map((s, idx) => (
                <td key={idx} className="px-3 py-2 text-center">
                  <span className="text-muted-foreground">{s.tried}</span>
                  <span className="text-muted-foreground/50 mx-0.5">/</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">{s.solved}</span>
                </td>
              ))}
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
