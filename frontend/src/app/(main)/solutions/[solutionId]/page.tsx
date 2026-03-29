'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatDuration, verdictCode, verdictColor } from '@/lib/utils';
import { decodeVerdictFull, VERDICT_LABELS } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import type { Solution, TestResult } from '@/types';

export default function SolutionDetailPage() {
  const params = useParams();
  const solutionId = params.solutionId as string;
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['solution', solutionId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/solutions/${solutionId}`);
      return res.data;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Please sign in to view this solution.</p>
        <Link href="/login" className="text-blue-600 hover:underline">Sign In</Link>
      </div>
    );
  }

  if (isLoading) return <Spinner />;

  const solution: Solution | undefined = data?.solution;
  const tests: TestResult[] = data?.tests ?? [];
  const language: string = data?.language || '';
  const problemTitle: string = data?.problem_title || '';
  const shortName: string = data?.short_name || '';
  const nickname: string = data?.nickname || '';

  if (!solution) {
    return <p className="text-center py-8 text-gray-500">Solution not found.</p>;
  }

  const verdictStr = decodeVerdictFull(solution.test_result);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Solution #{solution.solution_id}</h1>
        <Link href={solution.contest_id ? `/contests/${solution.contest_id}/solutions` : '/solutions'} className="text-sm text-blue-600 hover:underline">
          Back to Solutions
        </Link>
      </div>

      <Card title="Solution Info">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <dt className="text-gray-500">Solution ID</dt>
            <dd className="font-mono">{solution.solution_id}-{solution.problem_id}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <dt className="text-gray-500">Problem</dt>
            <dd>
              <Link href={`/problems/${solution.problem_id}`} className="text-blue-600 hover:underline font-medium">
                {shortName ? `${shortName}: ` : ''}{problemTitle || `#${solution.problem_id}`}
              </Link>
            </dd>
          </div>
          {nickname && (
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <dt className="text-gray-500">Author</dt>
              <dd>
                <Link href={`/users/${solution.user_id}`} className="text-blue-600 hover:underline">{nickname}</Link>
              </dd>
            </div>
          )}
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <dt className="text-gray-500">Filename</dt>
            <dd className="font-mono text-xs">{solution.filename || 'з редактору'}</dd>
          </div>
          {solution.checksum && (
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <dt className="text-gray-500">MD5</dt>
              <dd className="font-mono text-xs">{solution.checksum}</dd>
            </div>
          )}
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <dt className="text-gray-500">Language</dt>
            <dd className="font-medium">{language || `ID: ${solution.lang_id}`}</dd>
          </div>
          {solution.contest_time > 0 && (
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <dt className="text-gray-500">Contest Time</dt>
              <dd>{formatDuration(solution.contest_time)}</dd>
            </div>
          )}
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <dt className="text-gray-500">Submitted</dt>
            <dd>{formatDateTime(solution.posted_time)}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <dt className="text-gray-500">Checked</dt>
            <dd>{solution.checked_time ? formatDateTime(solution.checked_time) : '-'}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <dt className="text-gray-500">Result</dt>
            <dd>
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${verdictColor(verdictCode(solution.test_result))}`}>
                {verdictStr}
              </span>
            </dd>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <dt className="text-gray-500">Score</dt>
            <dd className="font-bold text-lg">{solution.test_score}</dd>
          </div>
        </dl>
      </Card>

      <div className="flex gap-4 text-sm">
        <Link href={`/problems/${solution.problem_id}`} className="text-blue-600 hover:underline">
          » All my solutions for this problem
        </Link>
        {solution.contest_id && (
          <Link href={`/contests/${solution.contest_id}/submit`} className="text-blue-600 hover:underline">
            » Submit solution
          </Link>
        )}
      </div>

      {solution.compile_error && (
        <Card title="Compilation Error">
          <pre className="text-sm text-red-700 bg-red-50 p-4 rounded overflow-x-auto font-mono whitespace-pre-wrap">
            {solution.compile_error}
          </pre>
        </Card>
      )}

      {tests.length > 0 && (
        <Card title="Test Results">
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                  <TableHead className="text-right">Memory</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((t) => {
                  const code = verdictCode(t.test_result);
                  const color = verdictColor(code);
                  const timeSec = t.test_time ? (t.test_time / 1000).toFixed(3) : '0.000';
                  const memKb = t.test_mem ? `${(t.test_mem / 1024).toFixed(1)}k` : '-';
                  return (
                    <TableRow key={t.test_no}>
                      <TableCell>{t.test_no}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${color}`}>
                          {VERDICT_LABELS[code] || code}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">{t.test_score}</TableCell>
                      <TableCell className="text-right font-mono">{timeSec}</TableCell>
                      <TableCell className="text-right font-mono">{memKb}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
