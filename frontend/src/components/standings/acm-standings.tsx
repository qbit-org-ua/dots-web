'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { StandingsData, ProblemScore, StandingsUser } from '@/types';
import type { ChangedCells } from '@/app/(main)/contests/[contestId]/standings/page';

function formatTime(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function computeRankRanges(users: StandingsUser[]): Map<number, string> {
  const ranges = new Map<number, string>();
  let i = 0;
  while (i < users.length) {
    let j = i;
    while (j < users.length && users[j].place === users[i].place) j++;
    const label = j - i > 1 ? `${i + 1}-${j}` : `${i + 1}`;
    for (let k = i; k < j; k++) ranges.set(users[k].user_id, label);
    i = j;
  }
  return ranges;
}

export function AcmStandings({ data, contestId, currentUserId, canViewAll = false, changes }: { data: StandingsData; contestId?: string; currentUserId?: number; canViewAll?: boolean; changes?: ChangedCells | null }) {
  const { t } = useTranslation();
  const rankRanges = computeRankRanges(data.users);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-16">{t('standings.rank')}</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('standings.team')}</th>
            {data.problems.map((p) => (
              <th key={p.problem_id} className="px-3 py-2 text-center font-medium text-muted-foreground min-w-[70px]">
                {contestId ? (
                  <Link href={`/contests/${contestId}/problems/${p.problem_id}`} className="hover:text-primary transition-colors" title={p.title}>
                    {p.short_name}
                  </Link>
                ) : (
                  <span title={p.title}>{p.short_name}</span>
                )}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-muted-foreground">{t('standings.solved')}</th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground">{t('standings.penalty')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.users.map((user) => {
            const isMe = currentUserId != null && Number(currentUserId) === Number(user.user_id);
            const rankChanged = changes?.rankChanged.has(user.user_id);
            const totalChanged = changes?.totalChanged.has(user.user_id);
            const userScoreChanges = changes?.scoreChanged.get(user.user_id);
            return (
              <tr key={user.user_id} className={cn(
                'hover:bg-muted/50 transition-colors duration-700',
                isMe && 'bg-primary/5 font-medium',
                rankChanged && 'animate-pulse bg-blue-500/10',
              )}>
                <td className={cn(
                  'px-3 py-2 text-center text-xs font-mono transition-colors duration-700',
                  rankChanged ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-muted-foreground',
                )}>
                  {rankRanges.get(user.user_id) || user.place}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/users/${user.user_id}`} className={cn('hover:underline', isMe ? 'text-primary font-semibold' : 'text-primary font-medium')}>
                    {user.nickname}
                  </Link>
                </td>
                {user.scores.map((ps: ProblemScore, idx: number) => {
                  const solved = ps.is_solved;
                  const attempts = ps.attempts;
                  const canLink = ps.solution_id != null && ps.solution_id > 0 && contestId && (isMe || canViewAll);
                  const cellChanged = userScoreChanges?.has(idx);
                  const cellContent = solved ? (
                    <div>
                      <div className={cn('font-bold', ps.is_first_solve ? 'text-green-700 dark:text-green-300' : 'text-green-600 dark:text-green-400')}>
                        +{attempts > 1 ? attempts - 1 : ''}
                      </div>
                      <div className="text-muted-foreground">{formatTime(ps.time)}</div>
                    </div>
                  ) : attempts > 0 ? (
                    <div className="font-bold text-red-600 dark:text-red-400">-{attempts}</div>
                  ) : null;

                  return (
                    <td
                      key={idx}
                      className={cn(
                        'px-3 py-1 text-center text-xs transition-all duration-700',
                        solved ? 'bg-green-500/15' : attempts > 0 ? 'bg-red-500/10' : '',
                        cellChanged && 'ring-2 ring-blue-500/50 ring-inset rounded animate-pulse',
                      )}
                    >
                      {canLink && cellContent ? (
                        <Link href={`/contests/${contestId}/solutions/${ps.solution_id}`} className="block underline decoration-dotted underline-offset-2 hover:decoration-solid">
                          {cellContent}
                        </Link>
                      ) : cellContent}
                    </td>
                  );
                })}
                <td className={cn('px-3 py-2 text-center font-bold transition-all duration-700', totalChanged && 'text-blue-600 dark:text-blue-400 animate-pulse')}>{user.total_solved}</td>
                <td className={cn('px-3 py-2 text-center text-muted-foreground transition-all duration-700', totalChanged && 'text-blue-600 dark:text-blue-400 animate-pulse')}>{user.penalty}</td>
              </tr>
            );
          })}
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
