import { AlertCircle, CheckCircle2 } from 'lucide-react';

// Must match backend/src/utils/passwordPolicy.js.
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'An uppercase letter (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'A lowercase letter (a–z)', test: (p: string) => /[a-z]/.test(p) },
  { label: 'A number (0–9)', test: (p: string) => /\d/.test(p) },
  { label: 'A special character (!@#$%)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const isStrongPassword = (password: string) => PASSWORD_RULES.every((r) => r.test(password));

/**
 * Stays hidden until the user starts typing, then warns only about the rules the password still
 * misses, and confirms once it meets all of them.
 */
export default function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null;
  const missing = PASSWORD_RULES.filter((rule) => !rule.test(password));

  if (!missing.length) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400" aria-live="polite">
        <CheckCircle2 className="h-3.5 w-3.5" /> Strong password
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400" aria-live="polite">
      <p className="mb-1 flex items-center gap-1.5 font-semibold">
        <AlertCircle className="h-3.5 w-3.5" /> Your password still needs:
      </p>
      <ul className="ml-5 list-disc space-y-0.5">
        {missing.map((rule) => <li key={rule.label}>{rule.label}</li>)}
      </ul>
    </div>
  );
}
