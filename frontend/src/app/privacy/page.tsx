import { ShieldCheck } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const sections = [
  {
    title: '1. Information We Collect',
    body: 'When you create an account, we collect your full name, email address, and phone number. To verify your identity, we collect a photo of your driver\'s license and a selfie. If you list a vehicle, we collect vehicle details and photos, including proof-of-ownership photos. When you make a payment, we process payment details (such as GCash reference information) needed to complete the transaction.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your information to create and secure your account, verify your identity before allowing bookings or listings, process bookings and payments, calculate owner earnings and platform commission, send booking and account notifications, and respond to support requests.',
  },
  {
    title: '3. Identity Verification Data',
    body: 'Your driver\'s license photo and selfie are used only to confirm your identity and eligibility to rent or list vehicles, and are reviewed by our admin team as part of the approval process. This information is not shared publicly on your profile or listings.',
  },
  {
    title: '4. Sharing of Information',
    body: 'To complete a booking, a customer\'s name and contact details are shared with the vehicle owner they book with, and vice versa. We do not sell your personal information to third parties. We may share information if required by law.',
  },
  {
    title: '5. Data Retention & Security',
    body: 'We retain account, booking, and verification data for as long as your account is active and as needed to comply with legal and business obligations. We take reasonable technical measures to protect your information, but no online platform can guarantee absolute security.',
  },
  {
    title: '6. Your Choices',
    body: 'You can update your profile information, phone number, and photo at any time from your Profile page. To request deletion of your account or data, contact us using the details below.',
  },
  {
    title: '7. Location Data',
    body: 'Vehicle listings include a pickup location within Cebu Province, set by the vehicle owner. We do not track your real-time device location.',
  },
  {
    title: '8. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time to reflect changes in our practices. Continued use of JLR Fleetlink after changes are posted constitutes acceptance of the updated policy.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg text-white mb-4">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Privacy <span className="gradient-text">Policy</span></h1>
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
              <h2 className="font-bold mb-2">Contact Us</h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                For privacy questions or data requests, contact us at{' '}
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
