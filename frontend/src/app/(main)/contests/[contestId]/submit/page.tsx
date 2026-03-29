'use client';

import React, { useState, useRef } from 'react';
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
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      setSource('');
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSource(e.target.value);
    if (e.target.value.trim()) {
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const hasSource = source.trim().length > 0;
    const hasFile = file !== null;

    if (!problemId || !languageId) {
      setError('Please select a problem and language.');
      return;
    }
    if (!hasSource && !hasFile) {
      setError('Please provide source code or upload a file.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('problem_id', problemId);
      formData.append('language_id', languageId);

      if (hasFile && file) {
        formData.append('file', file);
      } else {
        formData.append('source', source);
      }

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
      <Card>
        <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          Зверніть увагу: після відправки, рішення змінити не можна. Але, якщо це дозволено правилами
          конкурсу, можна завантажувати більше одного рішення для кожної задачі. Розмір рішення не
          повинен перевищувати 16Кб.
        </div>
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
            onChange={handleSourceChange}
            rows={15}
            className="font-mono text-sm"
            placeholder="Paste your source code here..."
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              or file:
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="text-xs text-gray-500">Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
            )}
          </div>
          <Button type="submit" loading={loading}>
            Submit
          </Button>
        </form>
      </Card>
    </div>
  );
}
