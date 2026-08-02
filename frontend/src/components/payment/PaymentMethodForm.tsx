'use client';

import Image from 'next/image';
import { CreditCard, ExternalLink, Smartphone, Sparkles } from 'lucide-react';

type GcashState = { phoneNumber: string; pin: string };
type CardState = { cardNumber: string; expiry: string; cvv: string; cardholderName: string };

interface PaymentMethodFormProps {
  method: 'gcash' | 'card';
  onMethodChange: (method: 'gcash' | 'card') => void;
  gcash: GcashState;
  onGcashChange: (value: GcashState) => void;
  card: CardState;
  onCardChange: (value: CardState) => void;
  showHeader?: boolean;
  cardLabel?: string;
  /** 'qr' shows a scannable GCash QR code instead of phone/PIN inputs. */
  gcashMode?: 'credentials' | 'qr';
  qrCodeSrc?: string;
}

export default function PaymentMethodForm({
  method,
  onMethodChange,
  gcash,
  onGcashChange,
  card,
  onCardChange,
  showHeader = true,
  cardLabel = 'Any Card',
  gcashMode = 'credentials',
  qrCodeSrc = '/gcash-qr.png',
}: PaymentMethodFormProps) {
  return (
    <div>
      {showHeader && (
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold">Payment Method</h3>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          onClick={() => onMethodChange('gcash')}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 font-semibold transition-all ${
            method === 'gcash'
              ? 'border-blue-600 bg-white text-blue-600 shadow-sm dark:bg-white dark:text-blue-600'
              : 'border-transparent bg-white/40 text-[var(--foreground)] dark:bg-white/10 dark:text-white/80'
          }`}
        >
          <Smartphone className="w-5 h-5" /> GCash
        </button>
        <button
          type="button"
          onClick={() => onMethodChange('card')}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 font-semibold transition-all ${
            method === 'card'
              ? 'border-blue-600 bg-white text-blue-600 shadow-sm dark:bg-white dark:text-blue-600'
              : 'border-transparent bg-white/40 text-[var(--foreground)] dark:bg-white/10 dark:text-white/80'
          }`}
        >
          <CreditCard className="w-5 h-5" /> {cardLabel}
        </button>
      </div>

      <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        {method === 'gcash' && gcashMode === 'qr' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-56 w-56 overflow-hidden rounded-2xl border border-[var(--card-border)]">
              <Image src={qrCodeSrc} alt="GCash QR code" fill className="object-contain" />
            </div>
            <p className="text-center text-sm text-[var(--muted)]">
              Scan this QR code using your GCash app to pay.
            </p>
            <a
              href="gcash://"
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-blue-600 px-4 py-3 text-sm font-semibold text-blue-600 sm:hidden"
            >
              <ExternalLink className="h-4 w-4" /> Open GCash App
            </a>
            <p className="text-center text-xs text-[var(--muted)] sm:hidden">
              On this phone? Take a screenshot of the QR, then in GCash tap Scan QR → Gallery to pay.
            </p>
          </div>
        ) : method === 'gcash' ? (
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input-field"
              type="tel"
              inputMode="numeric"
              name="gcash-mobile-number"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore
              placeholder="GCash Number (09XXXXXXXXX)"
              value={gcash.phoneNumber}
              onChange={(e) => onGcashChange({ ...gcash, phoneNumber: e.target.value })}
            />
            <input
              className="input-field"
              type="password"
              name="gcash-mpin"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore
              placeholder="GCash PIN"
              value={gcash.pin}
              onChange={(e) => onGcashChange({ ...gcash, pin: e.target.value })}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input-field col-span-2"
              type="text"
              inputMode="numeric"
              name="card-pan"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore
              placeholder="Card Number"
              value={card.cardNumber}
              onChange={(e) => onCardChange({ ...card, cardNumber: e.target.value })}
            />
            <input
              className="input-field"
              name="card-expiry"
              autoComplete="off"
              data-lpignore="true"
              placeholder="MM/YY"
              value={card.expiry}
              onChange={(e) => onCardChange({ ...card, expiry: e.target.value })}
            />
            <input
              className="input-field"
              type="password"
              name="card-cvv"
              autoComplete="new-password"
              data-lpignore="true"
              placeholder="CVV"
              value={card.cvv}
              onChange={(e) => onCardChange({ ...card, cvv: e.target.value })}
            />
            <input
              className="input-field col-span-2"
              name="card-name"
              autoComplete="off"
              data-lpignore="true"
              placeholder="Cardholder Name"
              value={card.cardholderName}
              onChange={(e) => onCardChange({ ...card, cardholderName: e.target.value })}
            />
          </div>
        )}
      </form>
    </div>
  );
}
