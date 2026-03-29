'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { ContestProblem, Language } from '@/types';

export default function ContestSubmitPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const router = useRouter();
  const { user } = useAuth();

  const [problemId, setProblemId] = useState('');
  const [languageId, setLanguageId] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: problemsData, isLoading: problemsLoading } = useQuery({
    queryKey: ['contest-problems', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}/problems`);
      return res.data;
    },
  });

  const { data: languagesData, isLoading: languagesLoading } = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const res = await api.get('/api/v1/languages');
      return res.data;
    },
  });

  const problems: ContestProblem[] = problemsData?.problems ?? [];
  const languages: Language[] = languagesData?.languages ?? [];

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Please sign in to submit solutions.</p>
        <Link href="/login" className="text-blue-600 hover:underline">Sign In</Link>
      </div>
    );
  }

  if (problemsLoading || languagesLoading) return <Spinner />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!problemId || !languageId || !source.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('problem_id', problemId);
      formData.append('language_id', languageId);
      formData.append('source', source);

      await api.post(`/api/v1/contests/${contestId}/solutions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      router.push(`/contests/${contestId}/solutions`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Submission failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Submit Solution</h1>
        <Link href={`/contests/${contestId}`} className="text-sm text-blue-600 hover:underline">
          Back to Contest
        </Link>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-md p-3">{error}</div>
          )}
          <Select
            label="Problem"
            value={problemId}
            onChange={(e) => setProblemId(e.target.value)}
            options={problems.map((p) => ({
              value: p.problem_id,
              label: `${p.short_name}. ${p.title}`,
            }))}
          />
          <Select
            label="Language"
            value={languageId}
            onChange={(e) => setLanguageId(e.target.value)}
            options={languages.map((l) => ({
              value: l.id,
              label: l.name,
            }))}
          />
          <Textarea
            label="Source Code"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={15}
            className="font-mono text-sm"
            placeholder="Paste your source code here..."
          />
          <Button type="submit" loading={loading}>
            Submit
          </Button>
        </form>
      </Card>
    </div>
  );
}
