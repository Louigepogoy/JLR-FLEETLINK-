-- Switching payment gateway from Xendit to PayMongo — rename gateway-specific columns
-- on payment_intents to gateway-agnostic names. Guarded so it's safe to re-run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_intents' AND column_name = 'xendit_invoice_id'
  ) THEN
    ALTER TABLE payment_intents RENAME COLUMN xendit_invoice_id TO gateway_session_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_intents' AND column_name = 'invoice_url'
  ) THEN
    ALTER TABLE payment_intents RENAME COLUMN invoice_url TO checkout_url;
  END IF;
END $$;
