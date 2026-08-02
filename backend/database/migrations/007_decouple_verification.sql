-- Decouple identity verification from registration: new accounts start 'unverified'
-- and can log in immediately; verification becomes its own flow for booking/listing.
-- This must be its own migration/transaction — Postgres won't let a new enum value
-- be used (even as a column DEFAULT) in the same transaction that added it.
ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'unverified';
