import { getAnalytics, logEvent } from 'firebase/analytics';

export const useAnalytics = () => {
  const analytics = getAnalytics();
  const log = (eventName: string, eventParams?: Record<string, any>) => logEvent(analytics, eventName, eventParams);
  return { log };
};
