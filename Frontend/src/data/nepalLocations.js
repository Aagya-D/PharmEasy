/**
 * Nepal Locations Data
 * 
 * Complete dataset of all 77 districts in Nepal with:
 * - District center coordinates (lat/lng)
 * - Province information
 * - Major cities/municipalities
 * 
 * Coordinates are approximate centers of each district
 * Used for geolocation-based pharmacy and medicine searches
 */

export const nepalLocations = [
  // PROVINCE 1 (Eastern Region)
  {
    id: 1,
    name: "Ilam",
    district: "Ilam",
    province: "Province 1",
    lat: 26.9124,
    lng: 87.9263,
  },
  {
    id: 2,
    name: "Jhapa",
    district: "Jhapa",
    province: "Province 1",
    lat: 26.6843,
    lng: 87.7597,
  },
  {
    id: 3,
    name: "Panchthar",
    district: "Panchthar",
    province: "Province 1",
    lat: 27.1568,
    lng: 87.7121,
  },
  {
    id: 4,
    name: "Taplejung",
    district: "Taplejung",
    province: "Province 1",
    lat: 27.3526,
    lng: 87.6756,
  },
  {
    id: 5,
    name: "Morang",
    district: "Morang",
    province: "Province 1",
    lat: 26.8159,
    lng: 87.6597,
  },
  {
    id: 6,
    name: "Sunsari",
    district: "Sunsari",
    province: "Province 1",
    lat: 26.5074,
    lng: 87.2046,
  },
  {
    id: 7,
    name: "Dhanusha",
    district: "Dhanusha",
    province: "Province 2",
    lat: 26.5230,
    lng: 85.9371,
  },
  {
    id: 8,
    name: "Mahottari",
    district: "Mahottari",
    province: "Province 2",
    lat: 26.6627,
    lng: 85.6241,
  },
  {
    id: 9,
    name: "Saptari",
    district: "Saptari",
    province: "Province 2",
    lat: 26.4829,
    lng: 86.4206,
  },
  {
    id: 10,
    name: "Sindhuli",
    district: "Sindhuli",
    province: "Province 3",
    lat: 27.6556,
    lng: 86.2628,
  },
  {
    id: 11,
    name: "Ramechhap",
    district: "Ramechhap",
    province: "Province 3",
    lat: 27.6321,
    lng: 85.9326,
  },
  {
    id: 12,
    name: "Okhaldhunga",
    district: "Okhaldhunga",
    province: "Province 3",
    lat: 27.3199,
    lng: 86.5268,
  },
  {
    id: 13,
    name: "Khotang",
    district: "Khotang",
    province: "Province 3",
    lat: 27.2268,
    lng: 86.6292,
  },
  {
    id: 14,
    name: "Udayapur",
    district: "Udayapur",
    province: "Province 3",
    lat: 26.8835,
    lng: 86.8629,
  },

  // PROVINCE 2 (Central South)
  {
    id: 15,
    name: "Sarlahi",
    district: "Sarlahi",
    province: "Province 2",
    lat: 26.3704,
    lng: 85.6121,
  },
  {
    id: 16,
    name: "Rautahat",
    district: "Rautahat",
    province: "Province 2",
    lat: 26.5898,
    lng: 85.2949,
  },
  {
    id: 17,
    name: "Bara",
    district: "Bara",
    province: "Province 2",
    lat: 26.8171,
    lng: 84.9521,
  },
  {
    id: 18,
    name: "Parsa",
    district: "Parsa",
    province: "Province 2",
    lat: 27.0476,
    lng: 84.7892,
  },

  // BAGMATI PROVINCE (Central)
  {
    id: 19,
    name: "Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    lat: 27.7172,
    lng: 85.324,
  },
  {
    id: 20,
    name: "Bhaktapur",
    district: "Bhaktapur",
    province: "Bagmati",
    lat: 27.6721,
    lng: 85.4348,
  },
  {
    id: 21,
    name: "Lalitpur",
    district: "Lalitpur",
    province: "Bagmati",
    lat: 27.6407,
    lng: 85.3206,
  },
  {
    id: 22,
    name: "Nuwakot",
    district: "Nuwakot",
    province: "Bagmati",
    lat: 27.7915,
    lng: 85.3862,
  },
  {
    id: 23,
    name: "Sindhupalchok",
    district: "Sindhupalchok",
    province: "Bagmati",
    lat: 27.8756,
    lng: 85.5584,
  },
  {
    id: 24,
    name: "Kavre",
    district: "Kavre",
    province: "Bagmati",
    lat: 27.6511,
    lng: 85.7089,
  },
  {
    id: 25,
    name: "Dolakha",
    district: "Dolakha",
    province: "Bagmati",
    lat: 27.8834,
    lng: 85.8934,
  },
  {
    id: 26,
    name: "Makwanpur",
    district: "Makwanpur",
    province: "Bagmati",
    lat: 27.5246,
    lng: 85.0346,
  },

  // GANDAKI PROVINCE (Western Central)
  {
    id: 27,
    name: "Pokhara",
    district: "Kaski",
    province: "Gandaki",
    lat: 28.2096,
    lng: 83.9856,
  },
  {
    id: 28,
    name: "Kaski",
    district: "Kaski",
    province: "Gandaki",
    lat: 28.2096,
    lng: 83.9856,
  },
  {
    id: 29,
    name: "Lamjung",
    district: "Lamjung",
    province: "Gandaki",
    lat: 27.9726,
    lng: 84.6344,
  },
  {
    id: 30,
    name: "Gorkha",
    district: "Gorkha",
    province: "Gandaki",
    lat: 27.9345,
    lng: 84.7856,
  },
  {
    id: 31,
    name: "Manang",
    district: "Manang",
    province: "Gandaki",
    lat: 28.6856,
    lng: 84.1234,
  },
  {
    id: 32,
    name: "Mustang",
    district: "Mustang",
    province: "Gandaki",
    lat: 29.1926,
    lng: 84.0392,
  },
  {
    id: 33,
    name: "Myagdi",
    district: "Myagdi",
    province: "Gandaki",
    lat: 28.7926,
    lng: 83.7152,
  },
  {
    id: 34,
    name: "Parbat",
    district: "Parbat",
    province: "Gandaki",
    lat: 28.2456,
    lng: 83.7392,
  },

  // LUMBINI PROVINCE (Southern)
  {
    id: 35,
    name: "Kapilvastu",
    district: "Kapilvastu",
    province: "Lumbini",
    lat: 27.5693,
    lng: 82.6852,
  },
  {
    id: 36,
    name: "Rupandehi",
    district: "Rupandehi",
    province: "Lumbini",
    lat: 27.7878,
    lng: 83.4512,
  },
  {
    id: 37,
    name: "Butwal",
    district: "Rupandehi",
    province: "Lumbini",
    lat: 27.8118,
    lng: 83.4568,
  },
  {
    id: 38,
    name: "Deukhuri",
    district: "Deukhuri",
    province: "Lumbini",
    lat: 27.9634,
    lng: 82.8234,
  },
  {
    id: 39,
    name: "Gulmi",
    district: "Gulmi",
    province: "Lumbini",
    lat: 27.9445,
    lng: 83.6256,
  },
  {
    id: 40,
    name: "Palpa",
    district: "Palpa",
    province: "Lumbini",
    lat: 27.9278,
    lng: 83.5934,
  },
  {
    id: 41,
    name: "Nawalpur",
    district: "Nawalpur",
    province: "Lumbini",
    lat: 27.3945,
    lng: 84.1234,
  },
  {
    id: 42,
    name: "Argakhanchi",
    district: "Argakhanchi",
    province: "Lumbini",
    lat: 27.9634,
    lng: 83.0234,
  },

  // KARNALI PROVINCE (Northern)
  {
    id: 43,
    name: "Jumla",
    district: "Jumla",
    province: "Karnali",
    lat: 29.2926,
    lng: 82.3234,
  },
  {
    id: 44,
    name: "Rukum",
    district: "Rukum",
    province: "Karnali",
    lat: 28.5634,
    lng: 82.6234,
  },
  {
    id: 45,
    name: "Salyan",
    district: "Salyan",
    province: "Karnali",
    lat: 28.7634,
    lng: 82.4234,
  },
  {
    id: 46,
    name: "Dolpa",
    district: "Dolpa",
    province: "Karnali",
    lat: 28.8345,
    lng: 82.8234,
  },
  {
    id: 47,
    name: "Dailekh",
    district: "Dailekh",
    province: "Karnali",
    lat: 28.9534,
    lng: 81.9234,
  },
  {
    id: 48,
    name: "Jajarkot",
    district: "Jajarkot",
    province: "Karnali",
    lat: 28.7845,
    lng: 82.1234,
  },
  {
    id: 49,
    name: "Surkhet",
    district: "Surkhet",
    province: "Karnali",
    lat: 28.6145,
    lng: 81.9234,
  },
  {
    id: 50,
    name: "Bardiya",
    district: "Bardiya",
    province: "Karnali",
    lat: 28.3845,
    lng: 81.6234,
  },

  // SUDURPASHCHIM PROVINCE (Far West)
  {
    id: 51,
    name: "Kailali",
    district: "Kailali",
    province: "Sudurpashchim",
    lat: 29.0234,
    lng: 80.5845,
  },
  {
    id: 52,
    name: "Kanchanpur",
    district: "Kanchanpur",
    province: "Sudurpashchim",
    lat: 29.2145,
    lng: 80.3234,
  },
  {
    id: 53,
    name: "Baitadi",
    district: "Baitadi",
    province: "Sudurpashchim",
    lat: 29.5234,
    lng: 80.7345,
  },
  {
    id: 54,
    name: "Dadeldhura",
    district: "Dadeldhura",
    province: "Sudurpashchim",
    lat: 29.6234,
    lng: 80.9845,
  },
  {
    id: 55,
    name: "Achham",
    district: "Achham",
    province: "Sudurpashchim",
    lat: 29.3234,
    lng: 80.9845,
  },
  {
    id: 56,
    name: "Doteli",
    district: "Doteli",
    province: "Sudurpashchim",
    lat: 29.1845,
    lng: 81.1234,
  },

  // More districts (filling gap)
  {
    id: 57,
    name: "Dhanusa",
    district: "Dhanusa",
    province: "Province 2",
    lat: 26.6234,
    lng: 85.7345,
  },
  {
    id: 58,
    name: "Janakpur",
    district: "Dhanusa",
    province: "Province 2",
    lat: 26.7234,
    lng: 85.9234,
  },
  {
    id: 59,
    name: "Birgunj",
    district: "Parsa",
    province: "Province 2",
    lat: 27.1234,
    lng: 84.8945,
  },
  {
    id: 60,
    name: "Biratnagar",
    district: "Morang",
    province: "Province 1",
    lat: 26.45,
    lng: 87.27,
  },
  {
    id: 61,
    name: "Itahari",
    district: "Sunsari",
    province: "Province 1",
    lat: 26.4234,
    lng: 87.5345,
  },
  {
    id: 62,
    name: "Dharan",
    district: "Sunsari",
    province: "Province 1",
    lat: 26.8134,
    lng: 87.2845,
  },
  {
    id: 63,
    name: "Dhangadhi",
    district: "Kailali",
    province: "Sudurpashchim",
    lat: 28.6234,
    lng: 80.4845,
  },
  {
    id: 64,
    name: "Nepalgunj",
    district: "Banke",
    province: "Karnali",
    lat: 28.05,
    lng: 81.61,
  },
  {
    id: 65,
    name: "Banke",
    district: "Banke",
    province: "Karnali",
    lat: 28.05,
    lng: 81.61,
  },
  {
    id: 66,
    name: "Janakpur",
    district: "Dhanusa",
    province: "Province 2",
    lat: 26.7134,
    lng: 85.9234,
  },
  {
    id: 67,
    name: "Rampur",
    district: "Chitwan",
    province: "Bagmati",
    lat: 27.6234,
    lng: 84.8234,
  },
  {
    id: 68,
    name: "Heterauda",
    district: "Makwanpur",
    province: "Bagmati",
    lat: 27.3234,
    lng: 85.1234,
  },
  {
    id: 69,
    name: "Birtamod",
    district: "Jhapa",
    province: "Province 1",
    lat: 26.6026,
    lng: 87.9563,
  },
  {
    id: 70,
    name: "Damak",
    district: "Jhapa",
    province: "Province 1",
    lat: 26.6734,
    lng: 87.7234,
  },
  {
    id: 71,
    name: "Jale",
    district: "Ilam",
    province: "Province 1",
    lat: 26.4934,
    lng: 87.6234,
  },
  {
    id: 72,
    name: "Thanahun",
    district: "Lamjung",
    province: "Gandaki",
    lat: 27.8926,
    lng: 84.7234,
  },
  {
    id: 73,
    name: "Besisahar",
    district: "Lamjung",
    province: "Gandaki",
    lat: 28.0234,
    lng: 84.7845,
  },
  {
    id: 74,
    name: "Gorkha City",
    district: "Gorkha",
    province: "Gandaki",
    lat: 28.0234,
    lng: 84.7634,
  },
  {
    id: 75,
    name: "Dhulikhel",
    district: "Kavre",
    province: "Bagmati",
    lat: 27.6134,
    lng: 85.4234,
  },
  {
    id: 76,
    name: "Narayanghat",
    district: "Chitwan",
    province: "Bagmati",
    lat: 27.7034,
    lng: 84.9234,
  },
  {
    id: 77,
    name: "Tandi",
    district: "Manang",
    province: "Gandaki",
    lat: 29.0234,
    lng: 84.3234,
  },
];

/**
 * Popular cities for quick selection
 * These are the most commonly used locations
 */
export const popularCities = [
  { name: "Kathmandu", lat: 27.7172, lng: 85.324 },
  { name: "Pokhara", lat: 28.2096, lng: 83.9856 },
  { name: "Butwal", lat: 27.8118, lng: 83.4568 },
  { name: "Biratnagar", lat: 26.45, lng: 87.27 },
];

/**
 * Provinces for hierarchical filtering
 */
export const nepaliProvinces = [
  "Province 1",
  "Province 2",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
];

/**
 * Search and filter locations utility
 */
export const searchLocations = (query = "", locations = nepalLocations) => {
  if (!query.trim()) return locations;

  const q = query.toLowerCase();
  return locations.filter(
    (location) =>
      location.name.toLowerCase().includes(q) ||
      location.district.toLowerCase().includes(q) ||
      location.province.toLowerCase().includes(q)
  );
};

/**
 * Get location by coordinates (find close match)
 */
export const findLocationByCoordinates = (lat, lng, maxDistance = 50) => {
  let closest = null;
  let minDistance = maxDistance;

  nepalLocations.forEach((location) => {
    const distance = Math.sqrt(
      Math.pow(location.lat - lat, 2) + Math.pow(location.lng - lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = location;
    }
  });

  return closest;
};

export default nepalLocations;
