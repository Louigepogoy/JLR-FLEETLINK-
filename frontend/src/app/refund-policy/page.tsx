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
    body: 'You can cancel an unpaid booking from My Bookings at any time. A paid booking can be cancelled with "Cancel & Refund" until the pickup time. If you cancel at least 24 hours before the pickup time, your online payment is refunded in full. If you cancel less than 24 hours before the pickup time, 50% of your online payment is refunded and the other 50% goes to the owner (less the platform commission) for holding the vehicle. Once the pickup time has passed or the vehicle has been handed over, the booking can no longer be cancelled from your account.',
  },
  {
    title: '4. Partial Payments and Cash',
    body: 'You can pay part of your booking online and the rest in cash to the owner at pickup. At least 10% of the total (or the platform commission rate, if higher) must be paid online to confirm your booking and reserve the vehicle. The owner collects the remaining cash when handing over the vehicle and confirms it in the app. Cash paid to the owner is not held by JLR Fleetlink and cannot be refunded through the platform, so only pay it when you have the vehicle in front of you.',
  },
  {
    title: '5. Unpaid Balance and No-Shows',
    body: 'If part of your booking is still unpaid and you do not pay it (online or in cash) and pick up the vehicle within 3 hours of the pickup time, the booking is cancelled automatically so the vehicle is available again. What you already paid is kept by the owner for holding the vehicle, and is not refunded. This also applies to a cash booking you do not pick up within 3 hours of the pickup time: the reservation fee you paid online goes to the owner. If a booking is fully paid and you do not pick up the vehicle, it is handed over automatically 3 hours after the pickup time, and the inspection time and payout steps below apply.',
  },
  {
    title: '6. Pickup Inspection',
    body: 'When you meet the owner, they will tap "Hand Over Vehicle." From that moment you have a set inspection time (60 minutes unless stated otherwise) to check the vehicle and choose Accept Vehicle or Reject Vehicle in My Bookings. If you do not respond before the time runs out, the vehicle is accepted automatically. You will receive a reminder 10 minutes before the deadline.',
  },
  {
    title: '7. Rejecting a Vehicle',
    body: 'If the vehicle does not match its listing or is not safe to use, reject it before the inspection time ends and explain what is wrong. You must attach at least one photo or video showing the problem — refunds are only given with proof, and the administrator may ask you for more. Rejecting cancels the booking immediately and frees the dates. 50% of your online payment is refunded to you automatically; the other 50% goes to the owner (less the platform commission) for holding the vehicle. If the automatic refund cannot be sent, your payment stays on hold while an administrator reviews your report. Please return the keys to the owner.',
  },
  {
    title: '8. How Disputes Are Decided',
    body: 'When you reject a vehicle with proof, the automatic 50% refund applies. If the automatic refund cannot be sent, or you contact us about a problem during your trip, an administrator compares the listing with your report and decides on one of three outcomes: a full refund, a partial refund (the owner receives the rest), or no refund if the report is not supported. Both you and the owner are notified of the decision.',
  },
  {
    title: '9. How You Receive a Refund',
    body: 'Refunds are sent back automatically to the same GCash, Maya, or card you paid with. GCash and Maya refunds usually arrive within 24 hours; card refunds can take up to 30 days depending on your bank. You do not need to claim it. If an automatic refund is not possible, we will send it to you manually through GCash or bank transfer.',
  },
  {
    title: '10. Payment Processing Fees',
    body: 'JLR Fleetlink covers the payment processing fee on refunds. You receive the full refund amount that was decided.',
  },
  {
    title: '11. Problems After You Accept the Vehicle',
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
