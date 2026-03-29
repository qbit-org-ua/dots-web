'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { StandingsData, ProblemScore } from '@/types';

function formatTime(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function AcmStandings({ data }: { data: StandingsData }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-3 py-2 text-left font-medium text-gray-500 w-12">#</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Team</th>
            {data.problems.map((p) => (
              <th key={p.problem_id} className="px-3 py-2 text-center font-medium text-gray-500 min-w-[70px]" title={p.title}>
                {p.short_name}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-gray-500">Solved</th>
            <th className="px-3 py-2 text-center font-medium text-gray-500">Penalty</th>
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
              </td>
              {user.scores.map((ps: ProblemScore, idx: number) => {
                const solved = ps.is_solved;
                const attempts = ps.attempts;
                return (
                  <td
                    key={idx}
                    className={cn(
                      'px-3 py-1 text-center text-xs',
                      solved ? 'bg-green-100' : attempts > 0 ? 'bg-red-50' : ''
                    )}
                  >
                    {solved ? (
                      <div>
                        <div className={cn('font-bold', ps.is_first_solve ? 'text-green-700' : 'text-green-600')}>
                          +{attempts > 1 ? attempts - 1 : ''}
                        </div>
                        <div className="text-gray-500">{formatTime(ps.time)}</div>
                      </div>
                    ) : attempts > 0 ? (
                      <div className="font-bold text-red-600">-{attempts}</div>
                    ) : null}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-bold">{user.total_solved}</td>
              <td className="px-3 py-2 text-center text-gray-600">{user.penalty}</td>
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
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
