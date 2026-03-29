'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import type { Problem } from '@/types';

export default function ProblemDetailPage() {
  const params = useParams();
  const problemId = params.problemId as string;

  const { data, isLoading } = useQuery({
    queryKey: ['problem', problemId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/problems/${problemId}`);
      return res.data;
    },
  });

  if (isLoading) return <Spinner />;

  const problem: Problem = data?.problem;
  if (!problem) {
    return <p className="text-center py-8 text-gray-500">Problem not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{problem.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span>Problem #{problem.problem_id}</span>
            {problem.complexity > 0 && (
              <Badge color="info">Difficulty: {problem.complexity}</Badge>
            )}
            <span>Posted: {formatDate(problem.posted_time)}</span>
          </div>
        </div>
        <Link href="/problems" className="text-sm text-blue-600 hover:underline">
          Back to Archive
        </Link>
      </div>

      <Card>
        {problem.description ? (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: problem.description }}
          />
        ) : (
          <p className="text-gray-500">No description available.</p>
        )}
      </Card>

      {problem.attachment && (
        <Card title="Attachments">
          <a
            href={`/api/v1/problems/${problem.problem_id}/attachment`}
            className="text-blue-600 hover:underline flex items-center gap-2"
            download
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Attachment
          </a>
        </Card>
      )}
    </div>
  );
}
