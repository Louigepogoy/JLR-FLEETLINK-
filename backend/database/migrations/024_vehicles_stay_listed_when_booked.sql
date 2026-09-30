-- Booking a vehicle no longer takes it off the listings: only the booked dates are blocked (via the
-- booking date-conflict checks). 'rented' was only ever set by the booking flow — owners can't pick
-- it — so vehicles left in that state go back to 'available'.
UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE status = 'rented';
