import { FileText } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const sections = [
  {
    title: '1. About JLR Fleetlink',
    body: 'JLR Fleetlink is a vehicle rental platform connecting customers with independent vehicle owners across Cebu City and nearby Cebu Province areas. We provide the booking, verification, and payment platform; vehicle owners are independently responsible for their vehicles and listings.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 18 years old and hold a valid driver\'s license to book or list a vehicle. Every customer and owner must complete identity verification (a driver\'s license photo and a selfie) before booking or publishing a listing. Accounts are subject to admin approval.',
  },
  {
    title: '3. Bookings',
    body: 'A booking request is not confirmed until it is approved by the vehicle owner. Pickup and return dates, times, and location are as agreed at booking. Late returns, damage, or violations of the vehicle owner\'s terms may result in additional charges billed directly by the owner.',
  },
  {
    title: '4. Cancellations',
    body: 'Bookings may be cancelled from My Bookings before they are approved. Once a rental is active, cancellation terms are between the customer and the vehicle owner. Repeated no-shows or cancellations may affect your ability to book on the platform.',
  },
  {
    title: '5. Payments',
    body: 'Bookings and owner subscriptions can be paid via GCash or card through the platform. Amounts charged reflect the price set by the vehicle owner (or the subscription plan selected) at time of booking. All prices are in Philippine Pesos (PHP).',
  },
  {
    title: '6. Owner Subscriptions & Commission',
    body: 'Vehicle owners must maintain an active subscription plan to publish listings, with vehicle limits based on plan tier (Basic, Pro, or Premium). The platform deducts a commission from completed bookings before owner payouts, at the rate published in your dashboard at time of booking.',
  },
  {
    title: '7. Vehicle Listings',
    body: 'Owners are responsible for the accuracy of their listings, including photos, pricing, and vehicle condition, and must provide proof photos as requested during listing and verification. Owners may block dates their vehicle is unavailable (e.g. for maintenance) using the Maintenance Dates feature.',
  },
  {
    title: '8. Prohibited Conduct',
    body: 'You may not use JLR Fleetlink for unlawful purposes, submit false verification documents, misrepresent a vehicle\'s condition or ownership, or attempt to circumvent the platform\'s booking or payment process.',
  },
  {
    title: '9. Limitation of Liability',
    body: 'JLR Fleetlink facilitates bookings between customers and independent vehicle owners and is not a party to the rental agreement itself. We are not liable for the condition of vehicles, conduct of owners or renters, or disputes arising from a rental, beyond our role as the booking platform.',
  },
  {
    title: '10. Changes to These Terms',
    body: 'We may update these Terms of Service from time to time. Continued use of JLR Fleetlink after changes are posted constitutes acceptance of the updated terms.',
  },
];

export default function TermsOfServicePage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg text-white mb-4">
              <FileText className="h-7 w-7" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Terms of <span className="gradient-text">Service</span></h1>
            <p className="text-[var(--muted)]">Last updated: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="glass-card p-6 lg:p-8 space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="font-bold mb-2">{section.title}</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{section.body}</p>
              </div>
            ))}
            <div>
              <h2 className="font-bold mb-2">Questions</h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                For questions about these terms, contact us at{' '}
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
