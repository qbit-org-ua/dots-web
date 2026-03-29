'use client';

import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">{t('about.title')}</h1>
      <Card>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <p dangerouslySetInnerHTML={{ __html: t('about.description') }} />
            <h3>{t('about.featuresTitle')}</h3>
            <ul>
              <li>{t('about.feature1')}</li>
              <li>{t('about.feature2')}</li>
              <li>{t('about.feature3')}</li>
              <li>{t('about.feature4')}</li>
              <li>{t('about.feature5')}</li>
              <li>{t('about.feature6')}</li>
            </ul>
            <h3>{t('about.contestTypesTitle')}</h3>
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t('about.classicDesc') }} />
              <li dangerouslySetInnerHTML={{ __html: t('about.acmDesc') }} />
              <li dangerouslySetInnerHTML={{ __html: t('about.ioiDesc') }} />
              <li dangerouslySetInnerHTML={{ __html: t('about.schoolDesc') }} />
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
