'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormSelect } from '@/components/ui/form-field';
import type { Contest, ContestProblem } from '@/types';

export default function AdminRejudgePage() {
  const [contestId, setContestId] = useState('');
  const [problemId, setProblemId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const { t } = useTranslation();

  const { data: contestsData } = useQuery({
    queryKey: ['contests-all'],
    queryFn: async () => {
      const res = await api.get('/api/v1/contests', { params: { per_page: 100 } });
      return res.data;
    },
  });

  const { data: problemsData } = useQuery({
    queryKey: ['contest-problems', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}/problems`);
      return res.data;
    },
    enabled: !!contestId,
  });

  const contests: Contest[] = contestsData?.contests ?? [];
  const problems: ContestProblem[] = problemsData?.problems ?? [];

  const handleRejudge = async () => {
    setLoading(true);
    setResult('');
    try {
      await api.post('/api/v1/admin/rejudge', {
        contest_id: Number(contestId),
        problem_id: problemId ? Number(problemId) : undefined,
      });
      setResult(t('admin.rejudgeStarted'));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('admin.rejudgeFailed');
      setResult(`${t('common.error')}: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-foreground">{t('admin.rejudgeSolutions')}</h1>

      <Card>
        <CardContent>
          <div className="space-y-4">
            <FormSelect
              label={t('admin.contest')}
              value={contestId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setContestId(e.target.value);
                setProblemId('');
              }}
              options={contests.map((c) => ({ value: c.contest_id, label: c.title }))}
            />
            {contestId && (
              <FormSelect
                label={t('admin.problemOptional')}
                value={problemId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProblemId(e.target.value)}
                options={problems.map((p) => ({ value: p.problem_id, label: `${p.short_name}. ${p.title}` }))}
              />
            )}
            <Button onClick={handleRejudge} disabled={loading || !contestId} variant="destructive">
              {loading ? t('admin.starting') : t('admin.startRejudge')}
            </Button>
            {result && (
              <div className={`text-sm rounded-md p-3 ${result.startsWith(t('common.error')) ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-300'}`}>
                {result}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
