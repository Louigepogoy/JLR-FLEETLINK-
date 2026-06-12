'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import PaymentMethodForm from '@/components/payment/PaymentMethodForm';
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
    features: ['Publish 5 Vehicle', 'Basic Listing', 'Up to 5 Photos'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 10000,
    billingCycle: 'month',
    vehicleLimit: 10,
    photoLimit: 5,
    features: ['Publish 10 Vehicle', 'Priority Listing', 'Up to 5 Photos'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 20000,
    billingCycle: 'month',
    vehicleLimit: 20,
    photoLimit: 5,
    features: ['Publish 20 Vehicle', 'Featured Placement', 'Up to 5 Photos'],
  },
];

export default function OwnerSubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(fallbackPlans[1]);
  const [method, setMethod] = useState<'gcash' | 'card'>('gcash');
  const [loading, setLoading] = useState(false);
  const [gcash, setGcash] = useState({ phoneNumber: '', pin: '' });
  const [card, setCard] = useState({ cardNumber: '', expiry: '', cvv: '', cardholderName: '' });

  useEffect(() => {
    Promise.all([
      api.get('/subscriptions/plans'),
      api.get('/subscriptions/me'),
    ]).then(([plansRes, subscriptionRes]) => {
      setPlans(plansRes.data.data);
      setSelectedPlan(plansRes.data.data.find((plan: Plan) => plan.id === 'pro') || plansRes.data.data[0]);
      setSubscription(subscriptionRes.data.data);
    }).catch(() => {});
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const payload = {
        planId: selectedPlan.id,
        paymentMethod: selectedPlan.price > 0 ? method : 'trial',
        paymentDetails: method === 'gcash' ? gcash : card,
      };
      const res = await api.post('/subscriptions/subscribe', payload);
      setSubscription(res.data.data);
      toast.success(`${selectedPlan.name} subscription activated`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: { msg: string }[] } } };
      toast.error(error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Subscription failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="owner">
      <div className="grid xl:grid-cols-[320px_1fr] gap-6">
        <aside className="glass-card overflow-hidden">
          <div className="p-6 border-b border-[var(--card-border)]">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white mb-5">
              <Crown className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-black leading-tight">
              Subscribe to
              <span className="block text-blue-600">publish your</span>
              vehicle.
            </h2>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Choose the plan that fits your Cebu rental business and unlock listing capacity.
            </p>
          </div>

          <div className="p-6 space-y-3">
            {subscription ? (
              <div className="rounded-2xl bg-blue-50 p-4 text-blue-900 dark:bg-blue-500/10 dark:text-blue-100">
                <p className="text-xs font-semibold uppercase tracking-wide">Current Plan</p>
                <p className="text-2xl font-black">{subscription.plan_name}</p>
                <p className="text-sm">{subscription.vehicle_limit} vehicles allowed</p>
                <p className="text-xs mt-2 capitalize">Paid via {subscription.payment_method}</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-[var(--muted)] dark:bg-white/5">
                No active subscription yet.
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              GCash and card payments are validated before activation.
            </div>
          </div>
        </aside>

        <section className="glass-card p-6 lg:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold text-blue-600 mb-2">Owner Subscription</p>
            <h1 className="text-3xl lg:text-5xl font-black">Choose a Subscription Plan</h1>
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
                  onClick={() => setSelectedPlan(plan)}
                  className={`relative text-left rounded-2xl border p-6 transition-all ${
                    active
                      ? 'border-blue-600 bg-blue-50/70 shadow-xl shadow-blue-900/10 dark:bg-blue-500/10'
                      : 'border-[var(--card-border)] bg-white/70 hover:border-blue-300 dark:bg-white/5'
                  }`}
                >
                  {plan.id === 'pro' && (
                    <span className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                      Popular
                    </span>
                  )}
                  {current && (
                    <span className="absolute right-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                      Active
                    </span>
                  )}
                  <h3 className="text-2xl font-black">{plan.name}</h3>
                  <p className="mt-3 text-sm text-[var(--muted)]">Perfect for getting started.</p>
                  <div className="mt-8 mb-6">
                    {plan.price === 0 ? (
                      <p className="text-4xl font-black">Free Trial</p>
                    ) : (
                      <p className="text-4xl font-black">
                        {formatCurrency(plan.price)}
                        <span className="text-base font-semibold text-[var(--muted)]"> / month</span>
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex min-h-11 items-center justify-center rounded-xl px-6 text-sm font-bold ${
                    active ? 'bg-blue-600 text-white' : 'border border-blue-600 text-blue-600'
                  }`}>
                    {plan.price === 0 ? 'Get' : 'Select Plan'}
                  </span>
                  <ul className="mt-8 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-blue-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-5">
            <div className="rounded-2xl border border-[var(--card-border)] bg-slate-200/80 p-5 dark:bg-slate-800/60">
              {selectedPlan.price === 0 ? (
                <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Basic starts as a free trial. No payment details required.
                </div>
              ) : (
                <PaymentMethodForm
                  method={method}
                  onMethodChange={setMethod}
                  gcash={gcash}
                  onGcashChange={setGcash}
                  card={card}
                  onCardChange={setCard}
                />
              )}
            </div>

            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm text-slate-300">Selected Plan</p>
              <h3 className="mt-1 text-3xl font-black">{selectedPlan.name}</h3>
              <p className="mt-4 text-4xl font-black">
                {selectedPlan.price === 0 ? 'Free' : formatCurrency(selectedPlan.price)}
              </p>
              <p className="text-sm text-slate-300">
                {selectedPlan.price === 0 ? '30-day trial' : 'Billed monthly'}
              </p>
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={loading}
                className="mt-6 min-h-12 w-full rounded-xl bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                {loading ? 'Processing...' : selectedPlan.price === 0 ? 'Activate Trial' : `Pay ${formatCurrency(selectedPlan.price)}`}
              </button>
              <p className="mt-4 text-xs text-slate-400">
                Payments are simulated for development and ready to connect to a live provider.
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
