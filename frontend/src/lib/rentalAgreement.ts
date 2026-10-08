// The Rental Agreement every renter accepts before booking. Keep RENTAL_AGREEMENT_VERSION in step with
// the backend (bookingController.js) and bump both whenever the wording changes.
export const RENTAL_AGREEMENT_VERSION = '2026-10';

export const rentalAgreementTerms: { title: string; body: string }[] = [
  {
    title: 'Use of the vehicle',
    body: 'Only the renter named in this booking, holding a valid driver\'s license, may drive the vehicle (unless the booking includes the owner\'s driver). The vehicle may not be sub-rented, used for ride-hailing or deliveries for pay, used in races, or used for anything illegal.',
  },
  {
    title: 'Pickup and inspection',
    body: 'The renter inspects the vehicle when the owner hands it over and accepts it or reports a problem in the app within the inspection time. After that, the vehicle is treated as received in good condition.',
  },
  {
    title: 'Return and late fees',
    body: 'The vehicle must be returned at the agreed date and drop-off time. Returning late costs the daily rate divided by 24 for every started hour late, added to the booking.',
  },
  {
    title: 'Fuel and cleanliness',
    body: 'Return the vehicle with the same fuel level and reasonably clean. Missing fuel or unusual cleaning may be charged by the owner at cost.',
  },
  {
    title: 'Damage, loss, and violations',
    body: 'The renter is responsible for damage, loss, or theft during the rental caused by their use or negligence, and for traffic violations, tolls, and parking fees incurred during the rental.',
  },
  {
    title: 'Accidents',
    body: 'In an accident, the renter must stay safe, report to the authorities when required, and inform the owner and JLR Fleetlink support right away.',
  },
  {
    title: 'Payment and cash',
    body: 'Online payments are held by JLR Fleetlink until the renter accepts the vehicle. For cash bookings, the reservation fee is paid online and the rest in cash to the owner at pickup; only online payments can be refunded through JLR Fleetlink.',
  },
  {
    title: 'Cancellations and refunds',
    body: 'Unpaid bookings are cancelled automatically. Refunds follow the JLR Fleetlink Refund Policy and, for disputes at pickup, the admin team\'s decision.',
  },
  {
    title: 'Documents during the trip',
    body: 'While the vehicle is with the renter, the app provides the vehicle\'s OR/CR and an authorization letter from the owner. The renter may show these to authorities but must not copy or share them otherwise.',
  },
];
