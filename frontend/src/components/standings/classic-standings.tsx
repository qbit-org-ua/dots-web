'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { StandingsData, ProblemScore } from '@/types';

function scoreColor(score: number, maxScore: number) {
  if (score >= maxScore && maxScore > 0) return 'bg-green-500/15 text-green-700 dark:text-green-300';
  if (score > 0) return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300';
  return '';
}

function RankCell({ place }: { place: number }) {
  if (place === 1) return <span className="text-lg" title="1st place">🥇</span>;
  if (place === 2) return <span className="text-lg" title="2nd place">🥈</span>;
  if (place === 3) return <span className="text-lg" title="3rd place">🥉</span>;
  return <span className="text-muted-foreground">{place}</span>;
}

export function ClassicStandings({ data }: { data: StandingsData }) {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">{t('standings.rank')}</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('standings.participant')}</th>
            {data.problems.map((p) => (
              <th key={p.problem_id} className="px-3 py-2 text-center font-medium text-muted-foreground min-w-[60px]" title={p.title}>
                {p.short_name}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-muted-foreground">{t('standings.total')}</th>
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
                {user.fio && <span className="text-muted-foreground/70 text-xs ml-2">{user.fio}</span>}
              </td>
              {user.scores.map((ps: ProblemScore, idx: number) => {
                const score = parseFloat(ps.score) || 0;
                const maxScore = 100;
                return (
                  <td
                    key={idx}
                    className={cn('px-3 py-2 text-center font-mono text-xs', scoreColor(score, maxScore))}
                  >
                    <Tooltip>
                      <TooltipTrigger className="cursor-default w-full">
                        {score > 0 ? ps.score : ps.is_solved ? '0' : ''}
                      </TooltipTrigger>
                      {score > 0 && (
                        <TooltipContent>
                          {t('standings.score')}: {ps.score} / {maxScore}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-bold">{user.total_score}</td>
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
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
