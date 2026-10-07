import { ReceiptText } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const sections = [
  {
    title: '1. Your Payment Is Held by JLR Fleetlink',
    body: 'When you pay for a booking, the money goes to JLR Fleetlink, not directly to the vehicle owner. We hold it until you have seen the vehicle at pickup and accepted it. Only then does the owner\'s share (the payment minus the platform commission) become available for payout.',
  },
  {
    title: '2. Paying Confirms Your Booking',
    body: 'Vehicle owners do not approve bookings. Your booking is confirmed as soon as your payment goes through. If you do not pay within 30 minutes of booking, the booking is cancelled automatically and the dates are released for other renters.',
  },
  {
    title: '3. Cancelling a Booking',
    body: 'You can cancel a booking yourself from My Bookings at any time before you pay. Once a booking has been paid, it can no longer be cancelled from your account; please contact the owner or our support team.',
  },
  {
    title: '4. Pickup Inspection',
    body: 'When you meet the owner, they will tap "Hand Over Vehicle." From that moment you have a set inspection time (60 minutes unless stated otherwise) to check the vehicle and choose Accept Vehicle or Reject Vehicle in My Bookings. If you do not respond before the time runs out, the vehicle is accepted automatically. You will receive a reminder 10 minutes before the deadline.',
  },
  {
    title: '5. Rejecting a Vehicle',
    body: 'If the vehicle does not match its listing or is not safe to use, reject it before the inspection time ends and explain what is wrong. You must attach at least one photo or video showing the problem — refunds are only given with proof, and the administrator may ask you for more. Rejecting cancels the booking immediately, frees the dates, and keeps your payment on hold while an administrator reviews your report. Please return the keys to the owner.',
  },
  {
    title: '6. How Disputes Are Decided',
    body: 'An administrator compares the listing with your report and decides on one of three outcomes: a full refund, a partial refund (the owner receives the rest), or no refund if the report is not supported. Both you and the owner are notified of the decision.',
  },
  {
    title: '7. How You Receive a Refund',
    body: 'Refunds are sent back automatically to the same GCash, Maya, or card you paid with. GCash and Maya refunds usually arrive within 24 hours; card refunds can take up to 30 days depending on your bank. You do not need to claim it. If an automatic refund is not possible, we will send it to you manually through GCash or bank transfer.',
  },
  {
    title: '8. Payment Processing Fees',
    body: 'JLR Fleetlink covers the payment processing fee on refunds. You receive the full refund amount that was decided.',
  },
  {
    title: '9. Problems After You Accept the Vehicle',
    body: 'Once a vehicle is accepted (by you or automatically), the pickup dispute process no longer applies. For problems during your trip, use Report Owner on the booking or contact our support team, and we will help resolve it.',
  },
];

export default function RefundPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg text-white mb-4">
              <ReceiptText className="h-7 w-7" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Refund &amp; Dispute <span className="gradient-text">Policy</span></h1>
            <p className="text-[var(--muted)]">How held payments, pickup inspections, disputes, and refunds work on JLR Fleetlink.</p>
          </div>

          <div className="glass-card p-6 lg:p-8 space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="font-bold mb-2">{section.title}</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{section.body}</p>
              </div>
            ))}
            <div>
              <h2 className="font-bold mb-2">Contact Us</h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Questions about a payment or refund? Contact us at{' '}
                <a href="mailto:support@jlrfleetlink.com" className="text-[var(--primary)] hover:underline">support@jlrfleetlink.com</a>.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
