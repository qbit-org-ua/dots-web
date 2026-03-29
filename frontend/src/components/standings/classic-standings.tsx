'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { StandingsData, ProblemScore } from '@/types';

function scoreColor(score: number, maxScore: number) {
  if (score >= maxScore && maxScore > 0) return 'bg-green-100 text-green-800';
  if (score > 0) return 'bg-yellow-100 text-yellow-800';
  return '';
}

export function ClassicStandings({ data }: { data: StandingsData }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-3 py-2 text-left font-medium text-gray-500 w-12">#</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Participant</th>
            {data.problems.map((p) => (
              <th key={p.problem_id} className="px-3 py-2 text-center font-medium text-gray-500 min-w-[60px]" title={p.title}>
                {p.short_name}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-gray-500">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.users.map((user) => (
            <tr key={user.user_id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-600 font-medium">{user.place}</td>
              <td className="px-3 py-2">
                <Link href={`/users/${user.user_id}`} className="text-blue-600 hover:underline font-medium">
                  {user.nickname}
                </Link>
                {user.fio && <span className="text-gray-400 text-xs ml-2">{user.fio}</span>}
              </td>
              {user.scores.map((ps: ProblemScore, idx: number) => {
                const score = parseFloat(ps.score) || 0;
                const maxScore = 100; // default max
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
            <tr className="bg-gray-50 border-t text-xs text-gray-500">
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
