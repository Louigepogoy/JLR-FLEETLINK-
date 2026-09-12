'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Crown, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type Plan = {
  id: 'basic' | 'pro' | 'premium';
  name: string;
  price: number;
  billingCycle: string;
  vehicleLimit: number;
  photoLimit: number;
  features: string[];
};

type Subscription = {
  plan_id: string;
  plan_name: string;
  price: number;
  billing_cycle: string;
  vehicle_limit: number;
  status: string;
  ends_at: string;
  payment_method: string;
  card_last_four?: string;
};

const fallbackPlans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    billingCycle: 'trial',
    vehicleLimit: 5,
    photoLimit: 5,
    features: ['Publish 5 Vehicle', 'Basic Listing', 'Up to 6 proof photos'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 10000,
    billingCycle: 'month',
    vehicleLimit: 10,
    photoLimit: 5,
    features: ['Publish 10 Vehicle', 'Priority Listing', 'Up to 6 proof photos'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 20000,
    billingCycle: 'month',
    vehicleLimit: 20,
    photoLimit: 5,
    features: ['Publish 20 Vehicle', 'Featured Placement', 'Up to 6 proof photos'],
  },
];

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const [pageLoading, setPageLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(fallbackPlans[1]);
  const [planChosen, setPlanChosen] = useState(false);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = () =>
    Promise.all([
      api.get('/subscriptions/plans'),
      api.get('/subscriptions/me'),
    ]).then(([plansRes, subscriptionRes]) => {
      const fetchedPlans: Plan[] = plansRes.data.data;
      const fetchedSubscription: Subscription | null = subscriptionRes.data.data;
      setPlans(fetchedPlans);
      setSubscription(fetchedSubscription);
      return { fetchedPlans, fetchedSubscription };
    }).catch(() => null);

  useEffect(() => {
    fetchData().then((result) => {
      if (result?.fetchedSubscription?.status === 'active') {
        const activePlan = result.fetchedPlans.find((p) => p.id === result.fetchedSubscription!.plan_id);
        if (activePlan) {
          setSelectedPlan(activePlan);
          setPlanChosen(true);
        }
      }
    }).finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (!payment) return;
    window.history.replaceState(null, '', '/dashboard/subscription');

    if (payment === 'failed') {
      toast.error('Payment was not completed');
      return;
    }

    toast.success('Payment received! Confirming with our system...');
    api.post('/paymongo/reconcile').catch(() => {}).finally(() => fetchData());
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      fetchData();
      if (attempts >= 6) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [searchParams]);

  const isCurrentPlan = subscription?.plan_id === selectedPlan.id && subscription?.status === 'active';

  const handleSubscribe = async () => {
    if (isCurrentPlan) return;
    setLoading(true);
    try {
      if (selectedPlan.price === 0) {
        const res = await api.post('/subscriptions/subscribe', { planId: selectedPlan.id });
        setSubscription(res.data.data);
        toast.success(`${selectedPlan.name} subscription activated`);
      } else {
        const res = await api.post('/paymongo/subscriptions/checkout', { planId: selectedPlan.id });
        window.location.href = res.data.data.checkoutUrl;
        return;
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: { msg: string }[] } } };
      toast.error(error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Subscription failed');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <DashboardLayout role="user">
        <div className="grid xl:grid-cols-[320px_1fr] gap-6">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <div className="grid xl:grid-cols-[320px_1fr] gap-6">
        <aside className="glass-card overflow-hidden">
          <div className="p-6 border-b border-[var(--card-border)]">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg text-white mb-5">
              <Crown className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-bold leading-tight">
              Subscribe to
              <span className="block gradient-text">publish your</span>
              vehicle.
            </h2>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Choose the plan that fits your Cebu rental business and unlock listing capacity.
            </p>
          </div>

          <div className="p-6 space-y-3">
            {subscription ? (
              <div className="rounded-2xl bg-[var(--primary)]/10 p-4 text-[var(--foreground)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Current Plan</p>
                <p className="text-2xl font-bold">{subscription.plan_name}</p>
                <p className="text-sm">{subscription.vehicle_limit} vehicles allowed</p>
                <p className="text-xs mt-2 capitalize">Paid via {subscription.payment_method}</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-[var(--card)] border border-[var(--card-border)] p-4 text-sm text-[var(--muted)]">
                No active subscription yet.
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Payments are processed securely via PayMongo.
            </div>
          </div>
        </aside>

        <section className="glass-card p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold text-[var(--primary)] mb-2">Become a Provider</p>
            <h1 className="text-3xl lg:text-5xl font-bold">Choose a Subscription Plan</h1>
            <p className="text-lg text-[var(--muted)] mt-3">
              Select the best plan to publish your vehicle and grow your rental business.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-5 mb-8">
            {plans.map((plan, index) => {
              const active = selectedPlan.id === plan.id;
              const current = subscription?.plan_id === plan.id && subscription?.status === 'active';

              return (
                <motion.button
                  key={plan.id}
                  type="button"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setPlanChosen(true);
                    paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`relative min-w-0 overflow-hidden text-left rounded-2xl border p-6 transition-all ${
                    active
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-xl shadow-sky-900/10'
                      : 'border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--primary)]/50'
                  }`}
                >
                  {plan.id === 'pro' && (
                    <span className="absolute right-4 top-4 rounded-full gradient-bg px-3 py-1 text-xs font-bold text-white">
                      Popular
                    </span>
                  )}
                  {current && (
                    <span className="absolute right-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                      Active
                    </span>
                  )}
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="mt-3 text-sm text-[var(--muted)]">Perfect for getting started.</p>
                  <div className="mt-8 mb-6">
                    {plan.price === 0 ? (
                      <p className="text-3xl font-bold break-words">Free Trial</p>
                    ) : (
                      <p className="flex flex-wrap items-baseline gap-x-1 text-3xl font-bold break-words">
                        <span>{formatCurrency(plan.price)}</span>
                        <span className="text-base font-semibold text-[var(--muted)]">/ month</span>
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex min-h-11 items-center justify-center rounded-xl px-6 text-sm font-bold ${
                    active ? 'gradient-bg text-white' : 'border border-[var(--primary)] text-[var(--primary)]'
                  }`}>
                    {plan.price === 0 ? 'Get' : 'Select Plan'}
                  </span>
                  <ul className="mt-8 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-[var(--primary)]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.button>
              );
            })}
          </div>

          <div ref={paymentSectionRef} className="grid lg:grid-cols-[1fr_360px] gap-5 scroll-mt-24">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5">
              {!planChosen ? (
                <div className="rounded-xl bg-[var(--card)] border border-dashed border-[var(--card-border)] p-4 text-sm text-[var(--muted)]">
                  Select a plan above to continue.
                </div>
              ) : isCurrentPlan ? (
                <div className="flex flex-col items-center gap-3 text-center py-6">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <Check className="h-7 w-7" />
                  </div>
                  <p className="font-semibold">This is your current plan</p>
                  <p className="text-sm text-[var(--muted)] max-w-xs">
                    Your {selectedPlan.name} subscription is already active. No need to pay again.
                  </p>
                </div>
              ) : selectedPlan.price === 0 ? (
                <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Basic starts as a free trial. No payment details required.
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center py-6">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <p className="font-semibold">Secure checkout via PayMongo</p>
                  <p className="text-sm text-[var(--muted)] max-w-xs">
                    You&apos;ll be taken to a secure PayMongo page to pay {formatCurrency(selectedPlan.price)} via GCash, card, or Maya.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl gradient-bg p-5 text-white">
              <p className="text-sm text-white/80">Selected Plan</p>
              <h3 className="mt-1 text-3xl font-bold">{selectedPlan.name}</h3>
              <p className="mt-4 text-4xl font-bold">
                {selectedPlan.price === 0 ? 'Free' : formatCurrency(selectedPlan.price)}
              </p>
              <p className="text-sm text-white/80">
                {selectedPlan.price === 0 ? '30-day trial' : 'Billed monthly'}
              </p>
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={loading || !planChosen || isCurrentPlan}
                className="mt-6 min-h-12 w-full rounded-xl bg-white px-5 font-bold text-[var(--primary-dark)] transition hover:opacity-90 disabled:opacity-60"
              >
                {isCurrentPlan
                  ? 'Already Active'
                  : loading
                    ? 'Processing...'
                    : selectedPlan.price === 0
                      ? 'Activate Trial'
                      : `Continue to Payment - ${formatCurrency(selectedPlan.price)}`}
              </button>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionContent />
    </Suspense>
  );
}
