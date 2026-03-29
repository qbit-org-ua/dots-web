'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, verdictCode, verdictColor } from '@/lib/utils';
import { VERDICT_LABELS } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { VerdictBadge } from '@/components/verdict-badge';
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

  const solution: Solution = data?.solution;
  const tests: TestResult[] = data?.tests ?? [];

  if (!solution) {
    return <p className="text-center py-8 text-gray-500">Solution not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Solution #{solution.solution_id}</h1>
        <Link href="/solutions" className="text-sm text-blue-600 hover:underline">
          Back to Solutions
        </Link>
      </div>

      <Card title="Solution Info">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Problem</dt>
            <dd>
              <Link href={`/problems/${solution.problem_id}`} className="text-blue-600 hover:underline font-medium">
                {solution.problem_title || `#${solution.problem_id}`}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Language</dt>
            <dd className="font-medium">{solution.language_name || solution.language_id}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Result</dt>
            <dd><VerdictBadge result={solution.result} /></dd>
          </div>
          <div>
            <dt className="text-gray-500">Score</dt>
            <dd className="font-bold text-lg">{solution.score}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Max Time</dt>
            <dd>{solution.max_time} ms</dd>
          </div>
          <div>
            <dt className="text-gray-500">Max Memory</dt>
            <dd>{solution.max_memory} KB</dd>
          </div>
          <div>
            <dt className="text-gray-500">Submitted</dt>
            <dd>{formatDateTime(solution.posted_time)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Judged</dt>
            <dd>{solution.judged_time ? formatDateTime(solution.judged_time) : '-'}</dd>
          </div>
        </dl>
      </Card>

      {solution.compile_error && (
        <Card title="Compilation Error">
          <pre className="text-sm text-red-700 bg-red-50 p-4 rounded overflow-x-auto font-mono whitespace-pre-wrap">
            {solution.compile_error}
          </pre>
        </Card>
      )}

      {tests.length > 0 && (
        <Card title="Test Results">
          <div className="bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test #</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Time (ms)</TableHead>
                  <TableHead className="text-right">Memory (KB)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((t) => {
                  const code = verdictCode(t.test_result);
                  const color = verdictColor(code);
                  return (
                    <TableRow key={t.test_num}>
                      <TableCell>{t.test_num}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${color}`}>
                          {VERDICT_LABELS[code] || code}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{t.test_score}</TableCell>
                      <TableCell className="text-right">{t.test_time}</TableCell>
                      <TableCell className="text-right">{t.test_memory}</TableCell>
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
