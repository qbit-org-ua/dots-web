'use client';

import React, { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { FormSelect, FormTextarea } from '@/components/ui/form-field';
import { Loader2, Send } from 'lucide-react';
import type { ContestProblem, Language } from '@/types';

export default function ContestSubmitPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();

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
        <p className="text-muted-foreground mb-4">{t('auth.pleaseSignInSubmit')}</p>
        <Link href="/login" className="text-primary hover:underline">{t('auth.signIn')}</Link>
      </div>
    );
  }

  if (problemsLoading || languagesLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-10 w-24 rounded-lg" />
    </div>
  );

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
      setError(t('submit.selectProblemAndLanguage'));
      return;
    }
    if (!hasSource && !hasFile) {
      setError(t('submit.provideSource'));
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('problem_id', problemId);
      formData.append('lang_id', languageId);

      if (hasFile && file) {
        formData.append('file', file);
      } else {
        formData.append('source', source);
      }

      const res = await api.post(`/api/v1/contests/${contestId}/solutions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const solutionId = res.data?.solution_id;
      if (solutionId) {
        router.push(`/solutions/${solutionId}`);
      } else {
        router.push(`/contests/${contestId}/solutions`);
      }
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: { message?: string } | string } } })?.response?.data?.error;
      const msg = typeof errData === 'string' ? errData : (errData && typeof errData === 'object' ? errData.message : null) || t('submit.submissionFailed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div className="mb-4 rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm text-yellow-700 dark:text-yellow-300">
            {t('submit.notice')}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>
            )}
            <FormSelect
              label={t('submit.problem')}
              value={problemId}
              onChange={(e) => setProblemId(e.target.value)}
              options={problems.map((p) => ({
                value: p.problem_id,
                label: `${p.short_name}. ${p.title}`,
              }))}
            />
            <FormSelect
              label={t('submit.language')}
              value={languageId}
              onChange={(e) => setLanguageId(e.target.value)}
              options={languages.map((l) => ({
                value: l.id,
                label: l.name,
              }))}
            />
            <FormTextarea
              label={t('submit.sourceCode')}
              value={source}
              onChange={handleSourceChange}
              rows={15}
              className="font-mono text-sm"
              placeholder={t('submit.pastePlaceholder')}
            />
            <div className="space-y-1">
              <Label>{t('submit.orFile')}</Label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {file && (
                <p className="text-xs text-muted-foreground">{t('submit.selected')}: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading ? (
                <><Loader2 className="size-4 animate-spin" />{t('submit.submitting')}</>
              ) : (
                <><Send className="size-4" />{t('submit.submit')}</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
