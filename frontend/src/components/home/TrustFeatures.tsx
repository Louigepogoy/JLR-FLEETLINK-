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
    <section id="protection" className="py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-14" data-reveal>
          <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">Rent With <span className="gradient-text">Confidence</span></h2>
          <p className="text-[var(--muted)] max-w-2xl mx-auto">
            Every booking is protected from payment to pickup — for renters and owners alike.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card group p-4 sm:p-6 transition-transform hover:-translate-y-1">
              <IlloTile className="mb-3 h-12 w-12 sm:mb-5 sm:h-20 sm:w-20 transition-transform duration-300 group-hover:scale-105">
                <Icon className="h-8 w-8 sm:h-14 sm:w-14" />
              </IlloTile>
              <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2 leading-snug">{title}</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
