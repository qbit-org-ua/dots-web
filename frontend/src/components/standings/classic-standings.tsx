'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { StandingsData, ProblemScore, StandingsUser } from '@/types';

function scoreColor(score: number, maxScore: number) {
  if (score >= maxScore && maxScore > 0) return 'bg-green-500/15 text-green-700 dark:text-green-300';
  if (score > 0) return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300';
  return '';
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

export function ClassicStandings({ data, contestId, currentUserId, canViewAll = false }: { data: StandingsData; contestId?: string; currentUserId?: number; canViewAll?: boolean }) {
  const { t } = useTranslation();
  const rankRanges = computeRankRanges(data.users);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-16">{t('standings.rank')}</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('standings.participant')}</th>
            {data.problems.map((p) => (
              <th key={p.problem_id} className="px-3 py-2 text-center font-medium text-muted-foreground min-w-[60px]">
                {contestId ? (
                  <Link href={`/contests/${contestId}/problems/${p.problem_id}`} className="hover:text-primary transition-colors" title={p.title}>
                    {p.short_name}
                  </Link>
                ) : (
                  <span title={p.title}>{p.short_name}</span>
                )}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-muted-foreground">{t('standings.total')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.users.map((user) => {
            const isMe = currentUserId === user.user_id;
            return (
              <tr key={user.user_id} className={cn('hover:bg-muted/50', isMe && 'bg-primary/5 font-medium')}>
                <td className="px-3 py-2 text-muted-foreground text-center text-xs font-mono">
                  {rankRanges.get(user.user_id) || user.place}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/users/${user.user_id}`} className={cn('hover:underline', isMe ? 'text-primary font-semibold' : 'text-primary font-medium')}>
                    {user.nickname}
                  </Link>
                  {user.fio && <span className="text-muted-foreground/70 text-xs ml-2">{user.fio}</span>}
                </td>
                {user.scores.map((ps: ProblemScore, idx: number) => {
                  const score = parseFloat(ps.score) || 0;
                  const maxScore = 100;
                  const display = score > 0 ? ps.score : ps.is_solved ? '0' : '';
                  const canLink = ps.solution_id && contestId && (isMe || canViewAll);
                  return (
                    <td
                      key={idx}
                      className={cn('px-3 py-2 text-center font-mono text-xs', scoreColor(score, maxScore))}
                    >
                      {canLink && display ? (
                        <Link href={`/contests/${contestId}/solutions/${ps.solution_id}`} className="hover:underline">
                          {display}
                        </Link>
                      ) : (
                        display
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-bold">{user.total_score}</td>
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
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
