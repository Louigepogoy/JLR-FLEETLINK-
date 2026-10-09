'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, RefreshCw } from 'lucide-react';

type CameraState = 'starting' | 'live' | 'captured' | 'error';

/**
 * Live camera capture (front camera on phones, webcam on laptops). There is deliberately no
 * file/gallery upload, so a selfie has to be taken on the spot. Needs HTTPS or localhost and the
 * viewer's camera permission.
 */
export default function CameraCapture({
  onCapture,
  initialPreview,
}: {
  onCapture: (file: File) => void;
  initialPreview?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>(initialPreview ? 'captured' : 'starting');
  const [preview, setPreview] = useState<string | null>(initialPreview || null);
  const [error, setError] = useState('');
  // Bumped to (re)start the camera, e.g. on Retake.
  const [session, setSession] = useState(initialPreview ? 0 : 1);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      Promise.resolve().then(() => {
        setError('Your browser can\'t open the camera. Use Chrome or Safari on your phone, over https.');
        setState('error');
      });
      return undefined;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setState('live');
      })
      .catch((err: DOMException) => {
        if (cancelled) return;
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera permission was blocked. Allow the camera in your browser (the camera/lock icon by the address bar), then tap Try again.'
            : err.name === 'NotFoundError'
              ? 'No camera was found. Please use a phone or a computer with a camera.'
              : 'Couldn\'t start the camera. Close other apps using it, then tap Try again.'
        );
        setState('error');
      });
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [session, stopCamera]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPreview(URL.createObjectURL(blob));
      setState('captured');
      stopCamera();
      onCapture(file);
    }, 'image/jpeg', 0.9);
  };

  const restart = () => {
    setError('');
    setState('starting');
    setSession((n) => n + 1);
  };

  return (
    <div>
      <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[var(--card-border)] bg-black/5">
        {state === 'captured' && preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your selfie" className="h-full w-full object-cover" />
        ) : (
          // Mirrored like a mirror while framing the shot; the saved photo isn't mirrored.
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full -scale-x-100 object-cover ${state === 'live' ? '' : 'hidden'}`}
          />
        )}
        {state === 'starting' && (
          <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Opening camera…
          </span>
        )}
        {state === 'error' && <p className="px-6 text-center text-sm text-red-500">{error}</p>}
      </div>

      <div className="mt-3 flex justify-center">
        {state === 'live' && (
          <button type="button" onClick={capture} className="btn-primary flex items-center gap-2">
            <Camera className="h-4 w-4" /> Capture
          </button>
        )}
        {state === 'captured' && (
          <button type="button" onClick={restart} className="btn-outline flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Retake
          </button>
        )}
        {state === 'error' && (
          <button type="button" onClick={restart} className="btn-outline flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}
