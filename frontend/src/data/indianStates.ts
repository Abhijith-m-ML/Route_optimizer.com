export interface IndianState {
  name: string;
  code: string;
  type: 'State' | 'Union Territory';
  center: { lat: number; lng: number };
  radiusMeters: number;
  aliases?: string[];
}

export const ALL_STATES_OPTION: IndianState = {
  name: 'All States',
  code: 'ALL',
  type: 'State',
  center: { lat: 20.5937, lng: 78.9629 },
  radiusMeters: 2000000,
};

export const INDIAN_STATES: IndianState[] = [
  // 28 States
  {
    name: 'Andhra Pradesh',
    code: 'AP',
    type: 'State',
    center: { lat: 15.9129, lng: 79.7400 },
    radiusMeters: 400000,
  },
  {
    name: 'Arunachal Pradesh',
    code: 'AR',
    type: 'State',
    center: { lat: 28.2180, lng: 94.7278 },
    radiusMeters: 300000,
  },
  {
    name: 'Assam',
    code: 'AS',
    type: 'State',
    center: { lat: 26.2006, lng: 92.9376 },
    radiusMeters: 300000,
  },
  {
    name: 'Bihar',
    code: 'BR',
    type: 'State',
    center: { lat: 25.0961, lng: 85.3131 },
    radiusMeters: 300000,
  },
  {
    name: 'Chhattisgarh',
    code: 'CG',
    type: 'State',
    center: { lat: 21.2787, lng: 81.8661 },
    radiusMeters: 350000,
  },
  {
    name: 'Goa',
    code: 'GA',
    type: 'State',
    center: { lat: 15.2993, lng: 74.1240 },
    radiusMeters: 80000,
  },
  {
    name: 'Gujarat',
    code: 'GJ',
    type: 'State',
    center: { lat: 22.2587, lng: 71.1924 },
    radiusMeters: 400000,
  },
  {
    name: 'Haryana',
    code: 'HR',
    type: 'State',
    center: { lat: 29.0588, lng: 76.0856 },
    radiusMeters: 200000,
  },
  {
    name: 'Himachal Pradesh',
    code: 'HP',
    type: 'State',
    center: { lat: 31.1048, lng: 77.1734 },
    radiusMeters: 220000,
  },
  {
    name: 'Jharkhand',
    code: 'JH',
    type: 'State',
    center: { lat: 23.6102, lng: 85.2799 },
    radiusMeters: 250000,
  },
  {
    name: 'Karnataka',
    code: 'KA',
    type: 'State',
    center: { lat: 15.3173, lng: 75.7139 },
    radiusMeters: 450000,
  },
  {
    name: 'Kerala',
    code: 'KL',
    type: 'State',
    center: { lat: 10.8505, lng: 76.2711 },
    radiusMeters: 300000,
    aliases: ['State of Kerala'],
  },
  {
    name: 'Madhya Pradesh',
    code: 'MP',
    type: 'State',
    center: { lat: 22.9734, lng: 78.6569 },
    radiusMeters: 500000,
  },
  {
    name: 'Maharashtra',
    code: 'MH',
    type: 'State',
    center: { lat: 19.7515, lng: 75.7139 },
    radiusMeters: 500000,
    aliases: ['State of Maharashtra'],
  },
  {
    name: 'Manipur',
    code: 'MN',
    type: 'State',
    center: { lat: 24.6637, lng: 93.9063 },
    radiusMeters: 150000,
  },
  {
    name: 'Meghalaya',
    code: 'ML',
    type: 'State',
    center: { lat: 25.4670, lng: 91.3662 },
    radiusMeters: 150000,
  },
  {
    name: 'Mizoram',
    code: 'MZ',
    type: 'State',
    center: { lat: 23.1645, lng: 92.9376 },
    radiusMeters: 150000,
  },
  {
    name: 'Nagaland',
    code: 'NL',
    type: 'State',
    center: { lat: 26.1584, lng: 94.5624 },
    radiusMeters: 150000,
  },
  {
    name: 'Odisha',
    code: 'OD',
    type: 'State',
    center: { lat: 20.9517, lng: 85.0985 },
    radiusMeters: 350000,
    aliases: ['Orissa'],
  },
  {
    name: 'Punjab',
    code: 'PB',
    type: 'State',
    center: { lat: 31.1471, lng: 75.3412 },
    radiusMeters: 200000,
  },
  {
    name: 'Rajasthan',
    code: 'RJ',
    type: 'State',
    center: { lat: 27.0238, lng: 74.2179 },
    radiusMeters: 550000,
  },
  {
    name: 'Sikkim',
    code: 'SK',
    type: 'State',
    center: { lat: 27.5330, lng: 88.5122 },
    radiusMeters: 100000,
  },
  {
    name: 'Tamil Nadu',
    code: 'TN',
    type: 'State',
    center: { lat: 11.1271, lng: 78.6569 },
    radiusMeters: 400000,
    aliases: ['State of Tamil Nadu'],
  },
  {
    name: 'Telangana',
    code: 'TS',
    type: 'State',
    center: { lat: 18.1124, lng: 79.0193 },
    radiusMeters: 300000,
    aliases: ['TG'],
  },
  {
    name: 'Tripura',
    code: 'TR',
    type: 'State',
    center: { lat: 23.9408, lng: 91.9882 },
    radiusMeters: 120000,
  },
  {
    name: 'Uttar Pradesh',
    code: 'UP',
    type: 'State',
    center: { lat: 26.8467, lng: 80.9462 },
    radiusMeters: 500000,
  },
  {
    name: 'Uttarakhand',
    code: 'UK',
    type: 'State',
    center: { lat: 30.0668, lng: 79.0193 },
    radiusMeters: 200000,
    aliases: ['UA', 'Uttaranchal'],
  },
  {
    name: 'West Bengal',
    code: 'WB',
    type: 'State',
    center: { lat: 22.9868, lng: 87.8550 },
    radiusMeters: 400000,
  },

  // 8 Union Territories
  {
    name: 'Andaman and Nicobar Islands',
    code: 'AN',
    type: 'Union Territory',
    center: { lat: 11.7401, lng: 92.6586 },
    radiusMeters: 300000,
  },
  {
    name: 'Chandigarh',
    code: 'CH',
    type: 'Union Territory',
    center: { lat: 30.7333, lng: 76.7794 },
    radiusMeters: 40000,
  },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    code: 'DN',
    type: 'Union Territory',
    center: { lat: 20.4283, lng: 72.8397 },
    radiusMeters: 100000,
    aliases: ['Dadra and Nagar Haveli', 'Daman and Diu'],
  },
  {
    name: 'Delhi',
    code: 'DL',
    type: 'Union Territory',
    center: { lat: 28.7041, lng: 77.1025 },
    radiusMeters: 60000,
    aliases: ['National Capital Territory of Delhi', 'NCT of Delhi', 'New Delhi'],
  },
  {
    name: 'Jammu and Kashmir',
    code: 'JK',
    type: 'Union Territory',
    center: { lat: 33.7782, lng: 76.5762 },
    radiusMeters: 300000,
  },
  {
    name: 'Ladakh',
    code: 'LA',
    type: 'Union Territory',
    center: { lat: 34.1526, lng: 77.5771 },
    radiusMeters: 350000,
  },
  {
    name: 'Lakshadweep',
    code: 'LD',
    type: 'Union Territory',
    center: { lat: 10.5667, lng: 72.6417 },
    radiusMeters: 150000,
  },
  {
    name: 'Puducherry',
    code: 'PY',
    type: 'Union Territory',
    center: { lat: 11.9416, lng: 79.8083 },
    radiusMeters: 60000,
    aliases: ['Pondicherry'],
  },
];

/**
 * Normalizes any raw state name or code from geocoding or address components
 * into a canonical Indian state name and code.
 */
export function normalizeStateName(
  rawName?: string | null,
  rawCode?: string | null
): { name: string; code: string; type: 'State' | 'Union Territory' | 'Unknown' } {
  if (!rawName && !rawCode) {
    return { name: 'Other', code: '', type: 'Unknown' };
  }

  const cleanName = (rawName || '').trim().toLowerCase();
  const cleanCode = (rawCode || '').trim().toUpperCase();

  // Try direct code match
  if (cleanCode) {
    const byCode = INDIAN_STATES.find(
      (s) => s.code.toUpperCase() === cleanCode || s.code.toUpperCase() === `IN-${cleanCode}`
    );
    if (byCode) {
      return { name: byCode.name, code: byCode.code, type: byCode.type };
    }
  }

  // Try direct name match or aliases
  if (cleanName) {
    for (const state of INDIAN_STATES) {
      if (state.name.toLowerCase() === cleanName) {
        return { name: state.name, code: state.code, type: state.type };
      }
      if (state.aliases && state.aliases.some((a) => a.toLowerCase() === cleanName)) {
        return { name: state.name, code: state.code, type: state.type };
      }
    }

    // Substring or fuzzy matching (e.g. "State of Kerala" or "Delhi")
    for (const state of INDIAN_STATES) {
      const sLower = state.name.toLowerCase();
      if (cleanName.includes(sLower) || sLower.includes(cleanName)) {
        return { name: state.name, code: state.code, type: state.type };
      }
    }
  }

  return {
    name: rawName ? rawName.trim() : 'Other',
    code: rawCode ? rawCode.trim().toUpperCase() : '',
    type: 'Unknown',
  };
}

export function getStateByName(name: string): IndianState | undefined {
  if (!name || name === 'All States' || name === 'ALL') {
    return ALL_STATES_OPTION;
  }
  const normalized = normalizeStateName(name);
  return INDIAN_STATES.find((s) => s.name === normalized.name);
}

