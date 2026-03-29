'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCode, Download, ArrowLeft } from 'lucide-react';
import type { Problem } from '@/types';

function cleanDescription(html: string): string {
  // Remove #problem marker used by the PHP system
  let cleaned = html.replace(/^#problem\s*/i, '');
  // Handle <attachment> tags from the PHP system - convert to download links
  cleaned = cleaned.replace(/<attachment[^>]*>(.*?)<\/attachment>/gi, '');
  return cleaned;
}

function ProblemDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export default function ProblemDetailPage() {
  const params = useParams();
  const problemId = params.problemId as string;
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const contestId = searchParams.get('contest_id');

  const { data, isLoading } = useQuery({
    queryKey: ['problem', problemId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/problems/${problemId}`);
      return res.data;
    },
  });

  if (isLoading) return <ProblemDetailSkeleton />;

  const problem: Problem = data?.problem;
  if (!problem) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🔍</div>
        <p className="text-muted-foreground text-lg">Problem not found</p>
        <p className="text-muted-foreground text-sm">This problem may have been removed or you may not have access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{problem.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span>Problem #{problem.problem_id}</span>
            {problem.complexity > 0 && (
              <Badge variant="outline">Difficulty: {problem.complexity}</Badge>
            )}
            <span>Posted: {formatDate(problem.posted_time)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {contestId && (
            <Link href={`/contests/${contestId}/submit`}>
              <Button size="sm" className="gap-1.5">
                <FileCode className="size-3.5" />
                Submit Solution
              </Button>
            </Link>
          )}
          <Link href="/problems" className="text-sm text-primary hover:underline flex items-center gap-1">
            <ArrowLeft className="size-3.5" />
            Back to Archive
          </Link>
        </div>
      </div>

      <Card>
        <CardContent>
          {problem.description ? (
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: cleanDescription(problem.description) }}
            />
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">No description available for this problem.</p>
              {problem.attachment && (
                <p className="text-muted-foreground text-sm">Check the attachment below for problem details.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {problem.attachment && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={`/api/v1/problems/${problem.problem_id}/attachment`}
              className="text-primary hover:underline flex items-center gap-2"
              download
            >
              <Download className="size-4" />
              Download Attachment
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
