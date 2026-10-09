'use client';

import { CheckCircle2, ImagePlus, X } from 'lucide-react';
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
  const totalSlots = vehicleProofSlots.length;
  const uploadedCount = vehicleProofSlots.filter(({ key }) => proofs[key]?.preview).length;

  const handleFile = (key: VehicleProofKey, file?: File) => {
    if (!file) return;
    onChange({
      ...proofs,
      [key]: { file, preview: URL.createObjectURL(file) },
    });
  };

  // Clears a photo so the owner can pick a different one (e.g. uploaded to the wrong slot).
  const removePhoto = (key: VehicleProofKey) => {
    onChange({ ...proofs, [key]: { file: null, preview: '' } });
  };

  return (
    <div className="md:col-span-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="text-sm font-medium">Vehicle Photos &amp; OR/CR ({totalSlots} required)</label>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Upload front, back, side, interior, you with the vehicle, extra proof, and the OR/CR. Tap ✕ to remove a wrong photo.
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          uploadedCount === totalSlots
            ? 'bg-emerald-500/15 text-emerald-600'
            : 'bg-[var(--primary)]/10 text-[var(--primary)]'
        }`}>
          {uploadedCount}/{totalSlots} uploaded
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
                  <button
                    type="button"
                    onClick={(e) => {
                      // Inside the label: don't open the file picker.
                      e.preventDefault();
                      e.stopPropagation();
                      removePhoto(key);
                    }}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow transition hover:bg-red-500"
                    aria-label={`Remove ${label} photo`}
                    title="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <ImagePlus className="mb-2 h-7 w-7 text-[var(--primary)]" />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs text-[var(--muted)] mt-1">{hint}</span>
                  {!required && (
                    <span className="mt-1 text-[11px] text-[var(--muted)]">Leave empty to keep the saved photo</span>
                  )}
                </>
              )}
              <input
                type="file"
                name={field}
                required={required && !hasPhoto}
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  handleFile(key, e.target.files?.[0]);
                  // Allow picking the same file again after removing it.
                  e.target.value = '';
                }}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
