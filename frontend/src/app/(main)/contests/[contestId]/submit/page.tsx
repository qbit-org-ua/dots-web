'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { FormSelect } from '@/components/ui/form-field';
import { CodeEditor, getMonacoLanguage } from '@/components/code-editor';
import { Loader2, Send } from 'lucide-react';
import type { ContestProblem, Language, Solution } from '@/types';

function draftKey(contestId: string, problemId: string): string {
  return `dots-draft-${contestId}-${problemId}`;
}

function saveDraft(contestId: string, problemId: string, source: string) {
  if (!problemId) return;
  try {
    if (source.trim()) {
      sessionStorage.setItem(draftKey(contestId, problemId), source);
    } else {
      sessionStorage.removeItem(draftKey(contestId, problemId));
    }
  } catch { /* quota exceeded or unavailable */ }
}

function loadDraft(contestId: string, problemId: string): string {
  if (!problemId) return '';
  try {
    return sessionStorage.getItem(draftKey(contestId, problemId)) || '';
  } catch {
    return '';
  }
}

function clearDraft(contestId: string, problemId: string) {
  try {
    sessionStorage.removeItem(draftKey(contestId, problemId));
  } catch { /* ignore */ }
}

export default function ContestSubmitPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contestId = params.contestId as string;
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();

  const preselectedProblem = searchParams.get('problem') || '';
  const preselectedLang = searchParams.get('lang') || '';

  const [problemId, setProblemId] = useState(preselectedProblem);
  const [languageId, setLanguageId] = useState(preselectedLang);
  const [source, setSource] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preselectApplied, setPreselectApplied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Fetch solutions from this contest first
  const { data: contestSolutionsData } = useQuery({
    queryKey: ['contest-solutions-preselect', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}/solutions`, {
        params: { per_page: 50 },
      });
      return res.data;
    },
    enabled: !!user && !preselectedLang,
  });

  // Also fetch user's global solutions (for language fallback across contests)
  const { data: globalSolutionsData } = useQuery({
    queryKey: ['global-solutions-preselect'],
    queryFn: async () => {
      const res = await api.get('/api/v1/solutions', {
        params: { per_page: 5, user_id: user!.user_id },
      });
      return res.data;
    },
    enabled: !!user && !preselectedLang && !(contestSolutionsData?.solutions?.length),
  });

  const problems: ContestProblem[] = problemsData?.problems ?? [];
  const languages: Language[] = languagesData?.languages ?? [];
  const contestSolutions: Solution[] = contestSolutionsData?.solutions ?? [];
  const globalSolutions: Solution[] = globalSolutionsData?.solutions ?? [];
  const userSolutions = contestSolutions.length > 0 ? contestSolutions : globalSolutions;

  // Recover draft on mount (initial problem from URL)
  useEffect(() => {
    if (preselectedProblem) {
      const draft = loadDraft(contestId, preselectedProblem);
      if (draft) {
        setSource(draft);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recover draft when problem changes (only if editor is not dirty)
  const handleProblemChange = useCallback((newProblemId: string) => {
    setProblemId(newProblemId);
    if (!dirty) {
      const draft = loadDraft(contestId, newProblemId);
      setSource(draft);
    }
    setDirty(false);
  }, [contestId, dirty]);

  // Autosave with debounce
  const handleSourceChange = useCallback((val: string) => {
    setSource(val);
    setDirty(true);
    if (val.trim()) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    // Debounce save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft(contestId, problemId, val);
    }, 500);
  }, [contestId, problemId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Auto-select language from previous solutions
  useEffect(() => {
    if (preselectApplied || languageId || !userSolutions.length) return;
    if (problemId) {
      const forProblem = userSolutions.find((s) => String(s.problem_id) === problemId);
      if (forProblem) {
        setLanguageId(String(forProblem.lang_id));
        setPreselectApplied(true);
        return;
      }
    }
    if (userSolutions[0]) {
      setLanguageId(String(userSolutions[0].lang_id));
      setPreselectApplied(true);
    }
  }, [problemId, userSolutions, languageId, preselectApplied]);

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

      // Clear draft on successful submission
      clearDraft(contestId, problemId);

      const solutionId = res.data?.solution_id;
      if (solutionId) {
        router.push(`/contests/${contestId}/solutions/${solutionId}`);
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
              onChange={(e) => handleProblemChange(e.target.value)}
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
            <div className="space-y-1.5">
              <Label>{t('submit.sourceCode')}</Label>
              <CodeEditor
                value={source}
                onChange={handleSourceChange}
                language={getMonacoLanguage(languages.find(l => String(l.id) === languageId)?.name ?? '')}
                height="400px"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('submit.orFile')}</Label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  setFile(selected);
                  if (selected) setSource('');
                }}
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
