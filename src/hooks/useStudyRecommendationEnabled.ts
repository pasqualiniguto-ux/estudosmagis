import { useEffect, useState } from 'react';

export const STUDY_RECOMMENDATION_STORAGE_KEY = 'studyRecommendationEnabled';
const EVENT_NAME = 'studyRecommendationEnabledChanged';

export function setStudyRecommendationEnabled(value: boolean) {
  localStorage.setItem(STUDY_RECOMMENDATION_STORAGE_KEY, value ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }));
}

export function useStudyRecommendationEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STUDY_RECOMMENDATION_STORAGE_KEY) !== 'false';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<boolean>;
      if (typeof ce.detail === 'boolean') setEnabled(ce.detail);
      else setEnabled(localStorage.getItem(STUDY_RECOMMENDATION_STORAGE_KEY) !== 'false');
    };
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return enabled;
}
