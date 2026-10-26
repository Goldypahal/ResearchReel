import { fetchApi } from './client';

export interface Subscription {
  plan: string;
  hasBillingAccount: boolean;
  billingEnabled: boolean;
  availablePlans: string[];
}

export const billingApi = {
  getSubscription: (): Promise<Subscription> => fetchApi('/billing/subscription'),
  checkout: (plan: string): Promise<{ url: string }> =>
    fetchApi('/billing/checkout', { method: 'POST', body: JSON.stringify({ plan }) }),
};
