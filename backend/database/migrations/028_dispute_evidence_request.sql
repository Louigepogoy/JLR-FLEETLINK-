-- Refunds now need proof. A renter must attach photo/video evidence when rejecting a vehicle, and an
-- admin can't refund a dispute that has no evidence. Instead the admin asks the renter for evidence
-- (with a note on what to show); the renter uploads it to the open dispute, which clears the request.
ALTER TABLE booking_disputes ADD COLUMN IF NOT EXISTS evidence_requested_at TIMESTAMPTZ;
ALTER TABLE booking_disputes ADD COLUMN IF NOT EXISTS evidence_request_note TEXT;
