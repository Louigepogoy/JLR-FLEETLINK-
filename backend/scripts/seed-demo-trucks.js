// Adds demo truck listings (with location, pricing and OR/CR proof) for a few registered owners so the
// Browse Vehicles page has trucks across Luzon, Visayas and Mindanao. Safe to re-run: a listing is
// skipped when its plate number already exists. Photos and OR/CR images reuse an existing real truck
// listing's uploads (these are demo placeholders, not real registration documents).
require('dotenv').config();
const { query, pool } = require('../src/config/db');

const TRUCKS = [
  { owner: 'justinsumalinog86@gmail.com', title: 'Isuzu Elf Closed Van — Mandaue', brand: 'Isuzu', model: 'Elf NHR', year: 2022, seats: 3,
    price: 3500, driver: 800, province: 'Cebu', city: 'Mandaue City', barangay: 'Subangdaku', pickup: 'A.S. Fortuna Street', lat: 10.3416, lng: 123.9392, plate: 'DEMO-TRK-101',
    desc: 'Closed-van light truck, good for hauling appliances, furniture and small business deliveries. Demo listing.' },
  { owner: 'justinsumalinog86@gmail.com', title: 'Mitsubishi Fuso Canter Dropside — Davao', brand: 'Mitsubishi', model: 'Fuso Canter', year: 2021, seats: 3,
    price: 4800, driver: 1000, province: 'Davao del Sur', city: 'Davao City', barangay: 'Buhangin', pickup: 'JP Laurel Avenue', lat: 7.1050, lng: 125.6136, plate: 'DEMO-TRK-102',
    desc: 'Dropside truck with 14-ft bed for construction materials and farm produce. Demo listing.' },
  { owner: 'sia3dbakugan@gmail.com', title: 'Hino 300 Wing Van — Cagayan de Oro', brand: 'Hino', model: '300 Series', year: 2023, seats: 3,
    price: 6500, driver: 1200, province: 'Misamis Oriental', city: 'Cagayan de Oro City', barangay: 'Carmen', pickup: 'Corrales Avenue', lat: 8.4868, lng: 124.6571, plate: 'DEMO-TRK-103',
    desc: 'Wing van for long-distance cargo with tie-down rails and a lift-friendly body. Demo listing.' },
  { owner: 'sia3dbakugan@gmail.com', title: 'Isuzu D-Max Pickup — Iloilo', brand: 'Isuzu', model: 'D-Max', year: 2022, seats: 5,
    price: 3000, driver: 700, province: 'Iloilo', city: 'Iloilo City', barangay: 'Mandurriao', pickup: 'Diversion Road', lat: 10.7123, lng: 122.5455, plate: 'DEMO-TRK-104',
    desc: '4x2 pickup for light hauling, trips to the province and weekend errands. Demo listing.' },
  { owner: 'owner@jlrfleetlink.com', title: 'Ford Ranger Pickup — Quezon City', brand: 'Ford', model: 'Ranger', year: 2023, seats: 5,
    price: 3800, driver: 900, province: 'Metro Manila', city: 'Quezon City', barangay: 'Bagumbayan', pickup: 'Eastwood Avenue', lat: 14.6099, lng: 121.0796, plate: 'DEMO-TRK-105',
    desc: 'Comfortable double-cab pickup with a lined bed, good for hauling and road trips. Demo listing.' },
  { owner: 'owner@jlrfleetlink.com', title: 'Isuzu Giga Cargo Truck — Bacolod', brand: 'Isuzu', model: 'Giga FVR', year: 2020, seats: 3,
    price: 7500, driver: 1500, province: 'Negros Occidental', city: 'Bacolod City', barangay: 'Mandalagan', pickup: 'Lacson Street', lat: 10.6840, lng: 122.9640, plate: 'DEMO-TRK-106',
    desc: '6-wheeler cargo truck for sugar, rice and bulk deliveries across Negros. Demo listing.' },
];

(async () => {
  try {
    const template = (await query("SELECT images, proof_photos FROM vehicles WHERE vehicle_type = 'Truck' AND proof_photos <> '{}'::jsonb ORDER BY created_at LIMIT 1")).rows[0];
    if (!template) throw new Error('No existing truck listing to borrow photos from');
    let added = 0;
    for (const t of TRUCKS) {
      const owner = (await query('SELECT id FROM users WHERE email = $1', [t.owner])).rows[0];
      if (!owner) { console.log(`skip ${t.title}: owner ${t.owner} not found`); continue; }
      if ((await query('SELECT 1 FROM vehicles WHERE plate_number = $1', [t.plate])).rows[0]) { console.log(`skip ${t.title}: already added`); continue; }
      await query(
        `INSERT INTO vehicles (owner_id, title, brand, model, plate_number, year, vehicle_type, transmission, fuel_type, seats,
           price_per_day, location, province, city, barangay, pickup_address, latitude, longitude, description,
           images, proof_photos, features, driver_available, driver_fee_per_day, status, verification_status)
         VALUES ($1,$2,$3,$4,$5,$6,'Truck','Manual','Diesel',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,true,$20,'available','approved')`,
        [owner.id, t.title, t.brand, t.model, t.plate, t.year, t.seats, t.price, `${t.city}, ${t.province}`, t.province, t.city,
          t.barangay, t.pickup, t.lat, t.lng, t.desc, template.images, template.proof_photos,
          ['Cargo space', 'Diesel', 'Driver available'], t.driver]
      );
      added += 1;
      console.log(`added ${t.title} (₱${t.price}/day) for ${t.owner}`);
    }
    console.log(`Done. ${added} demo truck(s) added.`);
  } catch (e) {
    console.error('Seed failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
