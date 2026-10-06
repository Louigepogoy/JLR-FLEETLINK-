import {
  ApprovedListingIllo, ChatMediaIllo, HeldPaymentIllo, IlloTile, InspectCarIllo, RatingsIllo, RefundIllo,
} from '@/components/illustrations/SpotIllustrations';

const features = [
  {
    icon: HeldPaymentIllo,
    title: 'Payment Held Until Pickup',
    desc: 'Your payment stays with JLR Fleetlink, not the owner, until you see the vehicle and accept it.',
  },
  {
    icon: InspectCarIllo,
    title: 'Inspect Before You Drive',
    desc: 'When the owner hands over the keys, you get time to check the vehicle and accept or reject it.',
  },
  {
    icon: RefundIllo,
    title: 'Fair Disputes & Fast Refunds',
    desc: 'If the vehicle doesn’t match its listing, an admin reviews it and refunds go straight back to your GCash, Maya, or card.',
  },
  {
    icon: ApprovedListingIllo,
    title: 'Approved by Admin',
    desc: 'Every listing is checked by our team. Rejected vehicles never appear in search.',
  },
  {
    icon: ChatMediaIllo,
    title: 'Chat With Photos & Videos',
    desc: 'Message owners and renters directly — share photos, videos, and your pickup location.',
  },
  {
    icon: RatingsIllo,
    title: 'Ratings & Reviews',
    desc: 'Renters and owners rate each other after every trip, so you always know who you’re dealing with.',
  },
];

/** Home page section highlighting the protections built into every rental. */
export default function TrustFeatures() {
  return (
    <section id="protection" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14" data-reveal>
          <h2 className="text-4xl font-bold mb-4">Rent With <span className="gradient-text">Confidence</span></h2>
          <p className="text-[var(--muted)] max-w-2xl mx-auto">
            Every booking is protected from payment to pickup — for renters and owners alike.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card group p-6 transition-transform hover:-translate-y-1">
              <IlloTile className="mb-5 h-20 w-20 transition-transform duration-300 group-hover:scale-105">
                <Icon className="h-14 w-14" />
              </IlloTile>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
