// Every province of the Philippines (plus Metro Manila), grouped by island group. `lat`/`lng` is the
// provincial capital (or main city), used as the default map pin; `cities` are suggestions only —
// owners can type any city or municipality.
// The backend validates against backend/src/data/ph-provinces.json; keep both lists in sync.

export type IslandGroup = 'Luzon' | 'Visayas' | 'Mindanao';

export type Province = {
  name: string;
  group: IslandGroup;
  lat: number;
  lng: number;
  cities: string[];
};

export const PHILIPPINES_CENTER = { lat: 12.8797, lng: 121.774 };

export const provinces: Province[] = [
  // Luzon
  { name: 'Metro Manila', group: 'Luzon', lat: 14.5995, lng: 120.9842, cities: ['Manila', 'Quezon City', 'Makati', 'Taguig', 'Pasig', 'Mandaluyong', 'Pasay', 'Parañaque', 'Las Piñas', 'Muntinlupa', 'Marikina', 'Caloocan', 'Valenzuela', 'Malabon', 'Navotas', 'San Juan', 'Pateros'] },
  { name: 'Abra', group: 'Luzon', lat: 17.5965, lng: 120.6179, cities: ['Bangued'] },
  { name: 'Apayao', group: 'Luzon', lat: 18.0239, lng: 121.1847, cities: ['Kabugao', 'Luna'] },
  { name: 'Benguet', group: 'Luzon', lat: 16.4023, lng: 120.596, cities: ['Baguio City', 'La Trinidad', 'Itogon'] },
  { name: 'Ifugao', group: 'Luzon', lat: 16.823, lng: 121.116, cities: ['Lagawe', 'Banaue'] },
  { name: 'Kalinga', group: 'Luzon', lat: 17.4189, lng: 121.4443, cities: ['Tabuk City'] },
  { name: 'Mountain Province', group: 'Luzon', lat: 17.0886, lng: 120.9774, cities: ['Bontoc', 'Sagada'] },
  { name: 'Ilocos Norte', group: 'Luzon', lat: 18.1978, lng: 120.5936, cities: ['Laoag City', 'Batac City', 'Pagudpud'] },
  { name: 'Ilocos Sur', group: 'Luzon', lat: 17.5747, lng: 120.3869, cities: ['Vigan City', 'Candon City'] },
  { name: 'La Union', group: 'Luzon', lat: 16.6159, lng: 120.3166, cities: ['San Fernando City', 'San Juan', 'Agoo'] },
  { name: 'Pangasinan', group: 'Luzon', lat: 16.0433, lng: 120.3333, cities: ['Dagupan City', 'Lingayen', 'San Carlos City', 'Urdaneta City', 'Alaminos City'] },
  { name: 'Batanes', group: 'Luzon', lat: 20.4487, lng: 121.9702, cities: ['Basco'] },
  { name: 'Cagayan', group: 'Luzon', lat: 17.6132, lng: 121.727, cities: ['Tuguegarao City', 'Aparri'] },
  { name: 'Isabela', group: 'Luzon', lat: 17.1486, lng: 121.8893, cities: ['Ilagan City', 'Cauayan City', 'Santiago City'] },
  { name: 'Nueva Vizcaya', group: 'Luzon', lat: 16.4845, lng: 121.1425, cities: ['Bayombong', 'Solano'] },
  { name: 'Quirino', group: 'Luzon', lat: 16.51, lng: 121.52, cities: ['Cabarroguis', 'Diffun'] },
  { name: 'Aurora', group: 'Luzon', lat: 15.7589, lng: 121.5623, cities: ['Baler'] },
  { name: 'Bataan', group: 'Luzon', lat: 14.676, lng: 120.536, cities: ['Balanga City', 'Mariveles'] },
  { name: 'Bulacan', group: 'Luzon', lat: 14.8433, lng: 120.8114, cities: ['Malolos City', 'Meycauayan City', 'San Jose del Monte City', 'Marilao'] },
  { name: 'Nueva Ecija', group: 'Luzon', lat: 15.4865, lng: 120.9667, cities: ['Cabanatuan City', 'Palayan City', 'San Jose City', 'Gapan City'] },
  { name: 'Pampanga', group: 'Luzon', lat: 15.0286, lng: 120.6898, cities: ['San Fernando City', 'Angeles City', 'Mabalacat City', 'Clark'] },
  { name: 'Tarlac', group: 'Luzon', lat: 15.4802, lng: 120.5979, cities: ['Tarlac City', 'Capas', 'Concepcion'] },
  { name: 'Zambales', group: 'Luzon', lat: 15.3276, lng: 119.978, cities: ['Iba', 'Olongapo City', 'Subic'] },
  { name: 'Batangas', group: 'Luzon', lat: 13.7565, lng: 121.0583, cities: ['Batangas City', 'Lipa City', 'Tanauan City', 'Nasugbu'] },
  { name: 'Cavite', group: 'Luzon', lat: 14.4297, lng: 120.9367, cities: ['Imus City', 'Bacoor City', 'Dasmariñas City', 'Tagaytay City', 'General Trias City'] },
  { name: 'Laguna', group: 'Luzon', lat: 14.2117, lng: 121.1653, cities: ['Calamba City', 'Santa Rosa City', 'San Pablo City', 'Biñan City', 'Santa Cruz'] },
  { name: 'Quezon', group: 'Luzon', lat: 13.9373, lng: 121.617, cities: ['Lucena City', 'Tayabas City'] },
  { name: 'Rizal', group: 'Luzon', lat: 14.5864, lng: 121.176, cities: ['Antipolo City', 'Cainta', 'Taytay', 'San Mateo', 'Rodriguez'] },
  { name: 'Marinduque', group: 'Luzon', lat: 13.4467, lng: 121.8406, cities: ['Boac'] },
  { name: 'Occidental Mindoro', group: 'Luzon', lat: 13.2233, lng: 120.596, cities: ['Mamburao', 'San Jose'] },
  { name: 'Oriental Mindoro', group: 'Luzon', lat: 13.4115, lng: 121.1803, cities: ['Calapan City', 'Puerto Galera'] },
  { name: 'Palawan', group: 'Luzon', lat: 9.7392, lng: 118.7353, cities: ['Puerto Princesa City', 'El Nido', 'Coron'] },
  { name: 'Romblon', group: 'Luzon', lat: 12.5751, lng: 122.2708, cities: ['Romblon', 'Odiongan'] },
  { name: 'Albay', group: 'Luzon', lat: 13.1391, lng: 123.7438, cities: ['Legazpi City', 'Ligao City', 'Tabaco City'] },
  { name: 'Camarines Norte', group: 'Luzon', lat: 14.1122, lng: 122.9553, cities: ['Daet'] },
  { name: 'Camarines Sur', group: 'Luzon', lat: 13.6218, lng: 123.1948, cities: ['Naga City', 'Pili', 'Iriga City'] },
  { name: 'Catanduanes', group: 'Luzon', lat: 13.581, lng: 124.233, cities: ['Virac'] },
  { name: 'Masbate', group: 'Luzon', lat: 12.37, lng: 123.62, cities: ['Masbate City'] },
  { name: 'Sorsogon', group: 'Luzon', lat: 12.974, lng: 124.005, cities: ['Sorsogon City'] },

  // Visayas
  { name: 'Aklan', group: 'Visayas', lat: 11.707, lng: 122.368, cities: ['Kalibo', 'Malay (Boracay)'] },
  { name: 'Antique', group: 'Visayas', lat: 10.75, lng: 121.94, cities: ['San Jose de Buenavista'] },
  { name: 'Capiz', group: 'Visayas', lat: 11.5853, lng: 122.7511, cities: ['Roxas City'] },
  { name: 'Guimaras', group: 'Visayas', lat: 10.657, lng: 122.596, cities: ['Jordan'] },
  { name: 'Iloilo', group: 'Visayas', lat: 10.7202, lng: 122.5621, cities: ['Iloilo City', 'Passi City', 'Oton'] },
  { name: 'Negros Occidental', group: 'Visayas', lat: 10.6765, lng: 122.9509, cities: ['Bacolod City', 'Silay City', 'Talisay City', 'San Carlos City'] },
  { name: 'Negros Oriental', group: 'Visayas', lat: 9.3068, lng: 123.3054, cities: ['Dumaguete City', 'Bais City'] },
  { name: 'Siquijor', group: 'Visayas', lat: 9.214, lng: 123.515, cities: ['Siquijor', 'Larena'] },
  { name: 'Bohol', group: 'Visayas', lat: 9.6496, lng: 123.8547, cities: ['Tagbilaran City', 'Panglao'] },
  { name: 'Cebu', group: 'Visayas', lat: 10.3157, lng: 123.8854, cities: ['Cebu City', 'Mandaue City', 'Lapu-Lapu City', 'Talisay City', 'Toledo City', 'Minglanilla', 'Consolacion', 'Cordova', 'Carcar City', 'Naga City', 'Danao City', 'Bogo City'] },
  { name: 'Biliran', group: 'Visayas', lat: 11.56, lng: 124.396, cities: ['Naval'] },
  { name: 'Eastern Samar', group: 'Visayas', lat: 11.607, lng: 125.432, cities: ['Borongan City'] },
  { name: 'Leyte', group: 'Visayas', lat: 11.2443, lng: 125.0039, cities: ['Tacloban City', 'Ormoc City', 'Baybay City'] },
  { name: 'Northern Samar', group: 'Visayas', lat: 12.499, lng: 124.638, cities: ['Catarman'] },
  { name: 'Samar', group: 'Visayas', lat: 11.7753, lng: 124.8861, cities: ['Catbalogan City', 'Calbayog City'] },
  { name: 'Southern Leyte', group: 'Visayas', lat: 10.133, lng: 124.835, cities: ['Maasin City'] },

  // Mindanao
  { name: 'Zamboanga del Norte', group: 'Mindanao', lat: 8.5883, lng: 123.3409, cities: ['Dipolog City', 'Dapitan City'] },
  { name: 'Zamboanga del Sur', group: 'Mindanao', lat: 6.9214, lng: 122.079, cities: ['Zamboanga City', 'Pagadian City'] },
  { name: 'Zamboanga Sibugay', group: 'Mindanao', lat: 7.782, lng: 122.587, cities: ['Ipil'] },
  { name: 'Bukidnon', group: 'Mindanao', lat: 8.1575, lng: 125.1278, cities: ['Malaybalay City', 'Valencia City'] },
  { name: 'Camiguin', group: 'Mindanao', lat: 9.25, lng: 124.716, cities: ['Mambajao'] },
  { name: 'Lanao del Norte', group: 'Mindanao', lat: 8.228, lng: 124.2452, cities: ['Iligan City', 'Tubod'] },
  { name: 'Misamis Occidental', group: 'Mindanao', lat: 8.4859, lng: 123.8047, cities: ['Oroquieta City', 'Ozamiz City', 'Tangub City'] },
  { name: 'Misamis Oriental', group: 'Mindanao', lat: 8.4542, lng: 124.6319, cities: ['Cagayan de Oro City', 'Gingoog City', 'El Salvador City'] },
  { name: 'Davao de Oro', group: 'Mindanao', lat: 7.601, lng: 125.966, cities: ['Nabunturan'] },
  { name: 'Davao del Norte', group: 'Mindanao', lat: 7.4478, lng: 125.8078, cities: ['Tagum City', 'Panabo City', 'Island Garden City of Samal'] },
  { name: 'Davao del Sur', group: 'Mindanao', lat: 7.1907, lng: 125.4553, cities: ['Davao City', 'Digos City'] },
  { name: 'Davao Occidental', group: 'Mindanao', lat: 6.415, lng: 125.611, cities: ['Malita'] },
  { name: 'Davao Oriental', group: 'Mindanao', lat: 6.955, lng: 126.217, cities: ['Mati City'] },
  { name: 'Cotabato', group: 'Mindanao', lat: 7.0083, lng: 125.0894, cities: ['Kidapawan City', 'Kabacan'] },
  { name: 'Sarangani', group: 'Mindanao', lat: 6.102, lng: 125.29, cities: ['Alabel', 'Glan'] },
  { name: 'South Cotabato', group: 'Mindanao', lat: 6.1164, lng: 125.1716, cities: ['General Santos City', 'Koronadal City'] },
  { name: 'Sultan Kudarat', group: 'Mindanao', lat: 6.629, lng: 124.605, cities: ['Isulan', 'Tacurong City'] },
  { name: 'Agusan del Norte', group: 'Mindanao', lat: 8.9475, lng: 125.5406, cities: ['Butuan City', 'Cabadbaran City'] },
  { name: 'Agusan del Sur', group: 'Mindanao', lat: 8.6057, lng: 125.9153, cities: ['Prosperidad', 'Bayugan City'] },
  { name: 'Dinagat Islands', group: 'Mindanao', lat: 10.006, lng: 125.572, cities: ['San Jose'] },
  { name: 'Surigao del Norte', group: 'Mindanao', lat: 9.784, lng: 125.4888, cities: ['Surigao City', 'General Luna (Siargao)'] },
  { name: 'Surigao del Sur', group: 'Mindanao', lat: 9.0783, lng: 126.1986, cities: ['Tandag City', 'Bislig City'] },
  { name: 'Basilan', group: 'Mindanao', lat: 6.705, lng: 121.971, cities: ['Isabela City', 'Lamitan City'] },
  { name: 'Lanao del Sur', group: 'Mindanao', lat: 7.9986, lng: 124.2928, cities: ['Marawi City'] },
  { name: 'Maguindanao del Norte', group: 'Mindanao', lat: 7.19, lng: 124.17, cities: ['Cotabato City', 'Datu Odin Sinsuat', 'Parang'] },
  { name: 'Maguindanao del Sur', group: 'Mindanao', lat: 6.715, lng: 124.787, cities: ['Buluan', 'Datu Piang'] },
  { name: 'Sulu', group: 'Mindanao', lat: 6.052, lng: 121.002, cities: ['Jolo'] },
  { name: 'Tawi-Tawi', group: 'Mindanao', lat: 5.029, lng: 119.773, cities: ['Bongao'] },
];

export const islandGroups: IslandGroup[] = ['Luzon', 'Visayas', 'Mindanao'];

export const provinceNames = provinces.map((p) => p.name);

export function getProvince(name?: string | null) {
  return provinces.find((p) => p.name === name) || null;
}

export function provincesByGroup(group: IslandGroup) {
  return provinces.filter((p) => p.group === group).sort((a, b) => {
    // Metro Manila first, then alphabetical.
    if (a.name === 'Metro Manila') return -1;
    if (b.name === 'Metro Manila') return 1;
    return a.name.localeCompare(b.name);
  });
}

// "Cebu City, Cebu" — skips the province when the city already names it (e.g. "Cebu" alone).
export function formatPlace(city?: string | null, province?: string | null, barangay?: string | null) {
  return [barangay, city, province && province !== city ? province : null].filter(Boolean).join(', ');
}
