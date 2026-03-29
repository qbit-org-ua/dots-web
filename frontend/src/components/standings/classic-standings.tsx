'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { StandingsData, ProblemScore } from '@/types';

function scoreColor(score: number, maxScore: number) {
  if (score >= maxScore && maxScore > 0) return 'bg-green-500/15 text-green-700 dark:text-green-300';
  if (score > 0) return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300';
  return '';
}

export function ClassicStandings({ data }: { data: StandingsData }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">#</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Participant</th>
            {data.problems.map((p) => (
              <th key={p.problem_id} className="px-3 py-2 text-center font-medium text-muted-foreground min-w-[60px]" title={p.title}>
                {p.short_name}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-muted-foreground">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.users.map((user) => (
            <tr key={user.user_id} className="hover:bg-muted/50">
              <td className="px-3 py-2 text-muted-foreground font-medium">{user.place}</td>
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
                    {score > 0 ? ps.score : ps.is_solved ? '0' : ''}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-bold">{user.total_score}</td>
            </tr>
          ))}
        </tbody>
        {data.summary && data.summary.length > 0 && (
          <tfoot>
            <tr className="bg-muted border-t border-border text-xs text-muted-foreground">
              <td className="px-3 py-1" colSpan={2}>Tried / Solved</td>
              {data.summary.map((s, idx) => (
                <td key={idx} className="px-3 py-1 text-center">
                  {s.tried} / {s.solved}
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
