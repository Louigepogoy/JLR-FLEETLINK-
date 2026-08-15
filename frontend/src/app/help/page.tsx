import { HelpCircle, Mail, Phone } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const faqSections = [
  {
    title: 'Booking a Vehicle',
    items: [
      {
        q: 'How do I book a vehicle?',
        a: 'Browse available vehicles in Cebu, open a listing, pick your pickup and return dates and times, then confirm your booking. You\'ll be asked to verify your driver\'s license before your first booking.',
      },
      {
        q: 'Why do I need to verify my license before booking?',
        a: 'To keep the platform safe for owners and renters, every customer must upload a driver\'s license photo and a selfie for admin approval before they can book or list a vehicle. This usually takes less than a day.',
      },
      {
        q: 'Can I cancel a booking?',
        a: 'Yes. Go to My Bookings in your dashboard to view or cancel a pending or approved booking. Once a rental is active, cancellations are handled directly with the vehicle owner.',
      },
      {
        q: 'What areas do you cover?',
        a: 'JLR Fleetlink currently operates only within Cebu City and nearby Cebu Province areas (Mandaue, Lapu-Lapu, Talisay, Toledo, Minglanilla, Consolacion, Cordova, Carcar, Naga, and other Cebu municipalities).',
      },
    ],
  },
  {
    title: 'Payments',
    items: [
      {
        q: 'What payment methods are supported?',
        a: 'Bookings and subscriptions can be paid via GCash or card. For GCash, you\'ll scan a QR code and send the exact amount shown on screen.',
      },
      {
        q: 'Is my payment refundable if I cancel?',
        a: 'Refund eligibility depends on your booking status and how far in advance you cancel. Contact support if you need help with a specific booking.',
      },
    ],
  },
  {
    title: 'Listing Your Vehicle (Owners)',
    items: [
      {
        q: 'How do I list my vehicle?',
        a: 'Go to My Vehicles in your dashboard and add your vehicle details along with 6 required photos (front, back, side, interior, you with the vehicle, and an ownership document). Listings are reviewed before appearing publicly.',
      },
      {
        q: 'Do I need a subscription to list vehicles?',
        a: 'Yes. Go to Become a Provider in your dashboard to choose a plan. Basic is a free trial with up to 5 vehicles; Pro and Premium unlock higher vehicle limits and priority placement.',
      },
      {
        q: 'Can I block out dates when my vehicle isn\'t available?',
        a: 'Yes. From My Vehicles, use Maintenance Dates on any listing to block a date range — customers won\'t be able to book your vehicle during that period.',
      },
      {
        q: 'How and when do I get paid?',
        a: 'Your earnings (after the platform commission is deducted) are tracked in the Earnings section of your dashboard, with a full history under Transactions.',
      },
    ],
  },
];

export default function HelpCenterPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg text-white mb-4">
              <HelpCircle className="h-7 w-7" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Help <span className="gradient-text">Center</span></h1>
            <p className="text-[var(--muted)]">Answers to common questions about renting and listing vehicles on JLR Fleetlink.</p>
          </div>

          <div className="space-y-6">
            {faqSections.map((section) => (
              <div key={section.title} className="glass-card p-6 lg:p-8">
                <h2 className="text-xl font-bold mb-5">{section.title}</h2>
                <div className="space-y-5">
                  {section.items.map((item) => (
                    <div key={item.q}>
                      <p className="font-semibold mb-1">{item.q}</p>
                      <p className="text-sm text-[var(--muted)]">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card p-6 lg:p-8 mt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Still need help?</h2>
            <p className="text-sm text-[var(--muted)] mb-4">Reach out and our team will get back to you.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <a href="mailto:support@jlrfleetlink.com" className="flex items-center gap-2 hover:text-[var(--primary)]">
                <Mail className="w-4 h-4" /> support@jlrfleetlink.com
              </a>
              <a href="tel:+639305503346" className="flex items-center gap-2 hover:text-[var(--primary)]">
                <Phone className="w-4 h-4" /> +63 930 550 3346
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
