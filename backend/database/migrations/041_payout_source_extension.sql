-- Payouts triggered by an "add hours" extension payment are recorded with source 'extension'.
ALTER TABLE owner_payouts DROP CONSTRAINT IF EXISTS owner_payouts_source_check;
ALTER TABLE owner_payouts ADD CONSTRAINT owner_payouts_source_check
  CHECK (source IN ('accepted', 'auto_accepted', 'dispute', 'account_added', 'manual', 'legacy', 'late_fee', 'extension'));
