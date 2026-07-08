'use client';

import { CheckCircle2, ImagePlus } from 'lucide-react';
import { vehicleProofSlots, type VehicleProofKey } from '@/lib/utils';

export type ProofPhotoState = Record<VehicleProofKey, { file: File | null; preview: string }>;

export const emptyProofPhotos = (): ProofPhotoState =>
  Object.fromEntries(
    vehicleProofSlots.map(({ key }) => [key, { file: null, preview: '' }])
  ) as ProofPhotoState;

interface VehicleProofUploadProps {
  proofs: ProofPhotoState;
  onChange: (proofs: ProofPhotoState) => void;
  required?: boolean;
}

export default function VehicleProofUpload({ proofs, onChange, required = true }: VehicleProofUploadProps) {
  const uploadedCount = vehicleProofSlots.filter(({ key }) => proofs[key]?.preview).length;

  const handleFile = (key: VehicleProofKey, file?: File) => {
    if (!file) return;
    onChange({
      ...proofs,
      [key]: { file, preview: URL.createObjectURL(file) },
    });
  };

  return (
    <div className="md:col-span-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="text-sm font-medium">Vehicle Photo Proof (6 required)</label>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Upload front, back, side, interior, you with the vehicle, and extra ownership proof.
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          uploadedCount === 6
            ? 'bg-emerald-500/15 text-emerald-600'
            : 'bg-[var(--primary)]/10 text-[var(--primary)]'
        }`}>
          {uploadedCount}/6 uploaded
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {vehicleProofSlots.map(({ key, field, label, hint }) => {
          const proof = proofs[key];
          const hasPhoto = Boolean(proof?.preview);

          return (
            <label
              key={key}
              className={`relative flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-3 text-center transition-all hover:border-[var(--primary)] ${
                hasPhoto
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-[var(--card-border)] bg-[var(--card)]'
              }`}
            >
              {hasPhoto ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proof.preview} alt={label} className="h-24 w-full rounded-lg object-cover" />
                  <span className="mt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {label}
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className="mb-2 h-7 w-7 text-[var(--primary)]" />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs text-[var(--muted)] mt-1">{hint}</span>
                </>
              )}
              <input
                type="file"
                name={field}
                required={required && !hasPhoto}
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => handleFile(key, e.target.files?.[0])}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
