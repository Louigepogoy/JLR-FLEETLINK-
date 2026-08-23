'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export type AiResult = {
  risk_score: number;
  verdict: 'low_risk' | 'medium_risk' | 'high_risk';
  reasons: string[];
  summary: string;
  model?: string;
  created_at?: string;
};

interface AiRiskPanelProps {
  analyzeUrl: string;
  initialResult?: AiResult | null;
}

const verdictStyles: Record<AiResult['verdict'], { label: string; classes: string; icon: typeof ShieldCheck }> = {
  low_risk: { label: 'Low Risk', classes: 'bg-emerald-500/10 text-emerald-600', icon: ShieldCheck },
  medium_risk: { label: 'Medium Risk', classes: 'bg-amber-500/10 text-amber-600', icon: ShieldQuestion },
  high_risk: { label: 'High Risk', classes: 'bg-red-500/10 text-red-600', icon: ShieldAlert },
};

export default function AiRiskPanel({ analyzeUrl, initialResult = null }: AiRiskPanelProps) {
  const [result, setResult] = useState<AiResult | null>(initialResult);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      const res = await api.post(analyzeUrl);
      setResult(res.data.data);
      toast.success('AI check complete');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'AI check failed');
    } finally {
      setLoading(false);
    }
  };

  const style = result ? verdictStyles[result.verdict] : null;
  const Icon = style?.icon;

  return (
    <div className="rounded-xl border border-[var(--card-border)] p-4 mb-6">
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> AI Risk Check
        </p>
        <button
          onClick={runCheck}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:opacity-50 flex items-center gap-1 shrink-0"
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          {loading ? 'Analyzing...' : result ? 'Re-run AI Check' : 'Run AI Check'}
        </button>
      </div>

      {result ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {Icon && <Icon className="w-4 h-4" />}
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${style?.classes}`}>{style?.label}</span>
            <span className="text-xs text-[var(--muted)]">Risk score: {result.risk_score}/100</span>
          </div>
          {result.summary && <p className="text-sm">{result.summary}</p>}
          {result.reasons?.length > 0 && (
            <ul className="text-xs text-[var(--muted)] list-disc list-inside space-y-0.5">
              {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          Not analyzed yet. Run an AI check to get a risk score and flagged concerns before deciding.
        </p>
      )}
    </div>
  );
}
