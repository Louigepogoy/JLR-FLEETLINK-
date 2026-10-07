'use client';

import { useEffect, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { CHAT_IMAGE_MAX_BYTES, CHAT_IMAGE_TYPES, CHAT_VIDEO_MAX_BYTES, CHAT_VIDEO_TYPES } from '@/lib/chat';

export type Evidence = { file: File; preview: string; kind: 'image' | 'video' };

type Props = {
  evidence: Evidence[];
  onChange: (evidence: Evidence[]) => void;
  max: number;
};

/** Photo/video picker with thumbnails, used as proof for pickup disputes. */
export default function EvidencePicker({ evidence, onChange, max }: Props) {
  // Every preview object URL created, freed when the picker unmounts.
  const previewUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const added: Evidence[] = [];
    for (const file of Array.from(files)) {
      if (evidence.length + added.length >= max) {
        toast.error(`You can attach up to ${max} files`);
        break;
      }
      const kind = CHAT_VIDEO_TYPES.includes(file.type) ? 'video' : CHAT_IMAGE_TYPES.includes(file.type) ? 'image' : null;
      if (!kind) {
        toast.error(`${file.name}: only JPEG, PNG, WebP photos or MP4, WebM, MOV videos`);
        continue;
      }
      if (file.size > (kind === 'video' ? CHAT_VIDEO_MAX_BYTES : CHAT_IMAGE_MAX_BYTES)) {
        toast.error(`${file.name} is too large (max ${kind === 'video' ? '50' : '5'} MB)`);
        continue;
      }
      const preview = URL.createObjectURL(file);
      previewUrls.current.push(preview);
      added.push({ file, preview, kind });
    }
    onChange([...evidence, ...added]);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {evidence.map((e, i) => (
          <div key={e.preview} className="relative">
            {e.kind === 'video' ? (
              <video src={e.preview} muted className="h-20 w-20 rounded-lg bg-black object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.preview} alt="Evidence" className="h-20 w-20 rounded-lg object-cover" />
            )}
            <button
              type="button"
              onClick={() => onChange(evidence.filter((_, j) => j !== i))}
              className="absolute -right-2 -top-2 rounded-full bg-black/70 p-0.5 text-white"
              aria-label="Remove file"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {evidence.length < max && (
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[var(--card-border)] text-xs text-[var(--muted)] hover:border-[var(--primary)]">
            <ImagePlus className="h-5 w-5" />
            Add
            <input
              type="file"
              multiple
              accept={[...CHAT_IMAGE_TYPES, ...CHAT_VIDEO_TYPES].join(',')}
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
            />
          </label>
        )}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">Photos up to 5 MB, videos up to 50 MB.</p>
    </>
  );
}
