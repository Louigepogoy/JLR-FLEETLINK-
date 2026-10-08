'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Briefcase, Camera, Check, CheckCircle2, Clock, IdCard, ShieldCheck, Upload, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Stepper from '@/components/ui/Stepper';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

const customerSteps = ['Why We Ask', 'License Number', 'License Photo', 'Selfie', 'Review'];
// Owners also prove their business and that they have a vehicle (OR/CR).
const ownerSteps = ['Why We Ask', 'License Number', 'License Photo', 'Selfie', 'Business & Vehicle', 'Review'];

const BUSINESS_PROOF_TYPES = [
  { value: 'dti', label: 'DTI Business Name Registration' },
  { value: 'mayors_permit', label: "Mayor's / Business Permit" },
  { value: 'sec', label: 'SEC Registration' },
  { value: 'bir_2303', label: 'BIR Certificate of Registration (Form 2303)' },
];

type DocField = 'licenseImage' | 'selfieImage' | 'businessProof' | 'ownerOr' | 'ownerCr';

function VerifyIdentityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  const { isAuthenticated, hasHydrated } = useAuthStore();

  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<VerificationStatus>('unverified');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [step, setStep] = useState(1);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [files, setFiles] = useState<Partial<Record<DocField, File>>>({});
  // Owner accounts must also add business proof and their vehicle's OR/CR.
  const [accountType, setAccountType] = useState<'customer' | 'owner' | 'both'>('both');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [docPreviews, setDocPreviews] = useState<Partial<Record<'businessProof' | 'ownerOr' | 'ownerCr', string>>>({});
  const docRefs = {
    businessProof: useRef<HTMLInputElement>(null),
    ownerOr: useRef<HTMLInputElement>(null),
    ownerCr: useRef<HTMLInputElement>(null),
  };
  const isOwnerAccount = accountType === 'owner' || accountType === 'both';
  const steps = isOwnerAccount ? ownerSteps : customerSteps;
  const DOCS_STEP = 5; // owners only
  const REVIEW_STEP = steps.length;
  const [submitting, setSubmitting] = useState(false);
  const licenseRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    api.get('/verification').then((res) => {
      const data = res.data.data;
      setStatus(data.approval_status || 'unverified');
      setRejectionReason(data.rejection_reason || '');
      if (data.account_type) setAccountType(data.account_type);
      setShowForm(data.approval_status === 'unverified' || !data.approval_status);
    }).catch(() => {}).finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, isAuthenticated]);

  const handleFile = (field: DocField, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setFiles((prev) => ({ ...prev, [field]: file }));
    const url = URL.createObjectURL(file);
    if (field === 'licenseImage') setLicensePreview(url);
    else if (field === 'selfieImage') setSelfiePreview(url);
    else setDocPreviews((prev) => ({ ...prev, [field]: url }));
  };

  const canContinue = () => {
    if (step === 2) return licenseNumber.trim().length > 0;
    if (step === 3) return !!files.licenseImage;
    if (step === 4) return !!files.selfieImage;
    if (isOwnerAccount && step === DOCS_STEP) {
      return !!businessType && businessName.trim().length > 0 && !!files.businessProof && !!files.ownerOr && !!files.ownerCr;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!files.licenseImage || !files.selfieImage) {
      toast.error('Both photos are required');
      return;
    }
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('licenseNumber', licenseNumber);
      data.append('licenseImage', files.licenseImage);
      data.append('selfieImage', files.selfieImage);
      if (isOwnerAccount) {
        if (!files.businessProof || !files.ownerOr || !files.ownerCr || !businessType || !businessName.trim()) {
          toast.error('Please add your business proof and your vehicle\'s OR/CR');
          setSubmitting(false);
          return;
        }
        data.append('businessProofType', businessType);
        data.append('businessName', businessName.trim());
        data.append('businessProof', files.businessProof);
        data.append('ownerOr', files.ownerOr);
        data.append('ownerCr', files.ownerCr);
      }

      const res = await api.post('/verification', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(res.data.message || 'Verification submitted');
      setStatus('pending');
      setShowForm(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } };
      toast.error(error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-16 min-h-screen flex justify-center">
          <div className="skeleton w-full max-w-lg h-96 rounded-2xl mx-4" />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen flex items-start justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-8 w-full max-w-lg"
        >
          {!showForm && status === 'approved' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold mb-2">You&apos;re verified</h1>
              <p className="text-sm text-[var(--muted)] mb-6">Your driver&apos;s license has been approved. You can book and list vehicles.</p>
              <Link href={returnTo} className="btn-primary inline-block">Continue</Link>
            </div>
          )}

          {!showForm && status === 'pending' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold mb-2">Under review</h1>
              <p className="text-sm text-[var(--muted)] mb-6">
                We&apos;re reviewing your driver&apos;s license and selfie. This usually takes less than a day — we&apos;ll notify you once it&apos;s done.
              </p>
              <Link href={returnTo} className="btn-outline inline-block">Back</Link>
            </div>
          )}

          {!showForm && status === 'rejected' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold mb-2">Verification not approved</h1>
              <p className="text-sm text-[var(--muted)] mb-6">
                {rejectionReason || 'Your submission could not be verified.'}
              </p>
              <button onClick={() => { setShowForm(true); setStep(1); }} className="btn-primary">Try Again</button>
            </div>
          )}

          {showForm && (
            <>
              <Stepper steps={steps} currentStep={step} />

              {step === 1 && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h1 className="text-xl font-bold mb-2">Verify your identity</h1>
                  <p className="text-sm text-[var(--muted)] mb-6">
                    {accountType === 'owner'
                      ? <>To keep renters safe, every vehicle owner verifies a valid driver&apos;s license, a business
                        document (DTI, Mayor&apos;s Permit, SEC, or BIR 2303), and the OR/CR of a vehicle they own before listing.</>
                      : accountType === 'customer'
                        ? <>To keep owners and their vehicles safe, every renter verifies a valid driver&apos;s license
                          before booking. It only takes a minute.</>
                        : <>To keep JLR Fleetlink safe for everyone, we ask every renter and vehicle owner to verify a valid
                          driver&apos;s license before booking or listing a vehicle. It only takes a minute.</>}
                  </p>
                  <button onClick={() => setStep(2)} className="btn-primary w-full">Get Started</button>
                </div>
              )}

              {step === 2 && (
                <div className="py-4">
                  <h2 className="font-semibold mb-1">What&apos;s your license number?</h2>
                  <p className="text-sm text-[var(--muted)] mb-4">Enter the number exactly as it appears on your license.</p>
                  <label className="text-sm font-medium mb-1 block">Driver&apos;s License Number</label>
                  <input
                    autoFocus
                    className="input-field"
                    placeholder="e.g. N01-12-345678"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="py-4">
                  <h2 className="font-semibold mb-1 flex items-center gap-2"><IdCard className="w-4 h-4" /> Photo of your license</h2>
                  <p className="text-sm text-[var(--muted)] mb-4">Make sure all details are clear and readable.</p>
                  <input ref={licenseRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleFile('licenseImage', e.target.files?.[0])} />
                  <button type="button" onClick={() => licenseRef.current?.click()}
                    className="w-full h-48 rounded-xl border-2 border-dashed border-[var(--card-border)] flex flex-col items-center justify-center gap-2 hover:border-[var(--primary)] transition-colors overflow-hidden">
                    {licensePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={licensePreview} alt="License" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-[var(--muted)]" />
                        <span className="text-sm text-[var(--muted)]">Tap to upload license photo</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {step === 4 && (
                <div className="py-4">
                  <h2 className="font-semibold mb-1 flex items-center gap-2"><Camera className="w-4 h-4" /> Take a live selfie</h2>
                  <p className="text-sm text-[var(--muted)] mb-4">Hold your license next to your face so we can match them.</p>
                  <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden"
                    onChange={(e) => handleFile('selfieImage', e.target.files?.[0])} />
                  <button type="button" onClick={() => selfieRef.current?.click()}
                    className="w-full h-48 rounded-xl border-2 border-dashed border-[var(--card-border)] flex flex-col items-center justify-center gap-2 hover:border-[var(--primary)] transition-colors overflow-hidden">
                    {selfiePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selfiePreview} alt="Selfie" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-[var(--muted)]" />
                        <span className="text-sm text-[var(--muted)]">Tap to take a selfie</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {isOwnerAccount && step === DOCS_STEP && (
                <div className="py-4 space-y-4">
                  <div>
                    <h2 className="font-semibold mb-1 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Business proof</h2>
                    <p className="text-sm text-[var(--muted)] mb-3">Required for owners. Choose the document you&apos;re uploading.</p>
                    <select className="input-field mb-3" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                      <option value="">Select business document…</option>
                      {BUSINESS_PROOF_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input
                      className="input-field"
                      placeholder="Business name (as written on the document)"
                      value={businessName}
                      maxLength={255}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                  {([
                    { field: 'businessProof', label: 'Business document photo', hint: 'The whole document, clear and readable' },
                    { field: 'ownerOr', label: 'OR (Official Receipt)', hint: 'LTO Official Receipt of a vehicle you own' },
                    { field: 'ownerCr', label: 'CR (Certificate of Registration)', hint: 'LTO Certificate of Registration of the same vehicle' },
                  ] as const).map(({ field, label, hint }) => (
                    <div key={field}>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-[var(--muted)] mb-2">{hint}</p>
                      <input ref={docRefs[field]} type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleFile(field, e.target.files?.[0])} />
                      <button type="button" onClick={() => docRefs[field].current?.click()}
                        className="flex h-28 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-[var(--card-border)] transition-colors hover:border-[var(--primary)]">
                        {docPreviews[field] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={docPreviews[field]} alt={label} className="h-full w-full object-cover" />
                        ) : (
                          <>
                            <Upload className="h-5 w-5 text-[var(--muted)]" />
                            <span className="text-sm text-[var(--muted)]">Tap to upload</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-[var(--muted)]">Only the JLR Fleetlink admin team sees these documents.</p>
                </div>
              )}

              {step === REVIEW_STEP && (
                <div className="py-4">
                  <h2 className="font-semibold mb-4">Review &amp; submit</h2>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--card-border)]">
                      <span className="text-sm text-[var(--muted)]">License Number</span>
                      <span className="text-sm font-medium">{licenseNumber}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="aspect-video rounded-xl overflow-hidden border border-[var(--card-border)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {licensePreview && <img src={licensePreview} alt="License" className="w-full h-full object-cover" />}
                      </div>
                      <div className="aspect-video rounded-xl overflow-hidden border border-[var(--card-border)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {selfiePreview && <img src={selfiePreview} alt="Selfie" className="w-full h-full object-cover" />}
                      </div>
                    </div>
                  </div>
                  {isOwnerAccount && (
                    <div className="mb-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--card-border)]">
                        <span className="text-sm text-[var(--muted)]">Business</span>
                        <span className="text-sm font-medium text-right">
                          {businessName} · {BUSINESS_PROOF_TYPES.find((t) => t.value === businessType)?.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {(['businessProof', 'ownerOr', 'ownerCr'] as const).map((field) => (
                          <div key={field} className="aspect-video rounded-xl overflow-hidden border border-[var(--card-border)]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {docPreviews[field] && <img src={docPreviews[field]} alt={field} className="w-full h-full object-cover" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
                    {submitting ? 'Submitting...' : <><Check className="w-4 h-4" /> Submit for Review</>}
                  </button>
                </div>
              )}

              {step > 1 && step < REVIEW_STEP && (
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setStep(step - 1)} className="btn-outline flex-1">Back</button>
                  <button onClick={() => setStep(step + 1)} disabled={!canContinue()} className="btn-primary flex-1 disabled:opacity-50">
                    Continue
                  </button>
                </div>
              )}
              {step === REVIEW_STEP && (
                <button onClick={() => setStep(REVIEW_STEP - 1)} className="text-sm text-[var(--muted)] hover:underline w-full text-center mt-3">
                  Back
                </button>
              )}
            </>
          )}
        </motion.div>
      </main>
      <Footer />
    </>
  );
}

export default function VerifyIdentityPage() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <main className="pt-24 pb-16 min-h-screen flex justify-center">
          <div className="skeleton w-full max-w-lg h-96 rounded-2xl mx-4" />
        </main>
      </>
    }>
      <VerifyIdentityContent />
    </Suspense>
  );
}
