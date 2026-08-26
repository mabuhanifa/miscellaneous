/**
 * Bangladesh Address Utilities
 * Contains division, district, and thana data for Bangladesh
 */

/**
 * Bangladesh administrative divisions data
 */
const bangladeshAddressData = {
  divisions: [
    {
      id: "dhaka",
      name: "Dhaka",
      nameBn: "ঢাকা",
      districts: [
        {
          id: "dhaka",
          name: "Dhaka",
          nameBn: "ঢাকা",
          thanas: [
            { id: "dhanmondi", name: "Dhanmondi", nameBn: "ধানমন্ডি" },
            { id: "gulshan", name: "Gulshan", nameBn: "গুলশান" },
            { id: "uttara", name: "Uttara", nameBn: "উত্তরা" },
            { id: "mirpur", name: "Mirpur", nameBn: "মিরপুর" },
            { id: "wari", name: "Wari", nameBn: "ওয়ারী" },
            { id: "old_dhaka", name: "Old Dhaka", nameBn: "পুরান ঢাকা" },
            { id: "tejgaon", name: "Tejgaon", nameBn: "তেজগাঁও" },
            { id: "ramna", name: "Ramna", nameBn: "রমনা" },
            { id: "motijheel", name: "Motijheel", nameBn: "মতিঝিল" },
            { id: "pallabi", name: "Pallabi", nameBn: "পল্লবী" },
          ],
        },
        {
          id: "gazipur",
          name: "Gazipur",
          nameBn: "গাজীপুর",
          thanas: [
            {
              id: "gazipur_sadar",
              name: "Gazipur Sadar",
              nameBn: "গাজীপুর সদর",
            },
            { id: "tongi", name: "Tongi", nameBn: "টঙ্গী" },
            { id: "kaliakair", name: "Kaliakair", nameBn: "কালিয়াকৈর" },
            { id: "kapasia", name: "Kapasia", nameBn: "কাপাসিয়া" },
            { id: "sreepur", name: "Sreepur", nameBn: "শ্রীপুর" },
          ],
        },
        {
          id: "narayanganj",
          name: "Narayanganj",
          nameBn: "নারায়ণগঞ্জ",
          thanas: [
            {
              id: "narayanganj_sadar",
              name: "Narayanganj Sadar",
              nameBn: "নারায়ণগঞ্জ সদর",
            },
            { id: "araihazar", name: "Araihazar", nameBn: "আড়াইহাজার" },
            { id: "bandar", name: "Bandar", nameBn: "বন্দর" },
            { id: "rupganj", name: "Rupganj", nameBn: "রূপগঞ্জ" },
            { id: "sonargaon", name: "Sonargaon", nameBn: "সোনারগাঁও" },
          ],
        },
      ],
    },
    {
      id: "chittagong",
      name: "Chittagong",
      nameBn: "চট্টগ্রাম",
      districts: [
        {
          id: "chittagong",
          name: "Chittagong",
          nameBn: "চট্টগ্রাম",
          thanas: [
            {
              id: "chittagong_sadar",
              name: "Chittagong Sadar",
              nameBn: "চট্টগ্রাম সদর",
            },
            { id: "panchlaish", name: "Panchlaish", nameBn: "পাঁচলাইশ" },
            {
              id: "double_mooring",
              name: "Double Mooring",
              nameBn: "ডাবল মুরিং",
            },
            { id: "kotwali", name: "Kotwali", nameBn: "কোতোয়ালী" },
            { id: "pahartali", name: "Pahartali", nameBn: "পাহাড়তলী" },
          ],
        },
        {
          id: "coxs_bazar",
          name: "Cox's Bazar",
          nameBn: "কক্সবাজার",
          thanas: [
            {
              id: "coxs_bazar_sadar",
              name: "Cox's Bazar Sadar",
              nameBn: "কক্সবাজার সদর",
            },
            { id: "chakaria", name: "Chakaria", nameBn: "চকরিয়া" },
            { id: "kutubdia", name: "Kutubdia", nameBn: "কুতুবদিয়া" },
            { id: "maheshkhali", name: "Maheshkhali", nameBn: "মহেশখালী" },
            { id: "ramu", name: "Ramu", nameBn: "রামু" },
          ],
        },
      ],
    },
    {
      id: "sylhet",
      name: "Sylhet",
      nameBn: "সিলেট",
      districts: [
        {
          id: "sylhet",
          name: "Sylhet",
          nameBn: "সিলেট",
          thanas: [
            { id: "sylhet_sadar", name: "Sylhet Sadar", nameBn: "সিলেট সদর" },
            { id: "south_surma", name: "South Surma", nameBn: "দক্ষিণ সুরমা" },
            { id: "companiganj", name: "Companiganj", nameBn: "কোম্পানীগঞ্জ" },
            { id: "gowainghat", name: "Gowainghat", nameBn: "গোয়াইনঘাট" },
            { id: "jaintiapur", name: "Jaintiapur", nameBn: "জৈন্তাপুর" },
          ],
        },
        {
          id: "moulvibazar",
          name: "Moulvibazar",
          nameBn: "মৌলভীবাজার",
          thanas: [
            {
              id: "moulvibazar_sadar",
              name: "Moulvibazar Sadar",
              nameBn: "মৌলভীবাজার সদর",
            },
            { id: "barlekha", name: "Barlekha", nameBn: "বড়লেখা" },
            { id: "juri", name: "Juri", nameBn: "জুড়ী" },
            { id: "kamalganj", name: "Kamalganj", nameBn: "কমলগঞ্জ" },
            { id: "kulaura", name: "Kulaura", nameBn: "কুলাউড়া" },
          ],
        },
      ],
    },
    {
      id: "rajshahi",
      name: "Rajshahi",
      nameBn: "রাজশাহী",
      districts: [
        {
          id: "rajshahi",
          name: "Rajshahi",
          nameBn: "রাজশাহী",
          thanas: [
            {
              id: "rajshahi_sadar",
              name: "Rajshahi Sadar",
              nameBn: "রাজশাহী সদর",
            },
            { id: "boalia", name: "Boalia", nameBn: "বোয়ালিয়া" },
            { id: "motihar", name: "Motihar", nameBn: "মতিহার" },
            { id: "rajpara", name: "Rajpara", nameBn: "রাজপাড়া" },
            { id: "shah_makhdum", name: "Shah Makhdum", nameBn: "শাহ মখদুম" },
          ],
        },
        {
          id: "bogra",
          name: "Bogra",
          nameBn: "বগুড়া",
          thanas: [
            { id: "bogra_sadar", name: "Bogra Sadar", nameBn: "বগুড়া সদর" },
            { id: "adamdighi", name: "Adamdighi", nameBn: "আদমদিঘী" },
            { id: "dhunat", name: "Dhunat", nameBn: "ধুনট" },
            { id: "gabtali", name: "Gabtali", nameBn: "গাবতলী" },
            { id: "kahaloo", name: "Kahaloo", nameBn: "কাহালু" },
          ],
        },
      ],
    },
    {
      id: "khulna",
      name: "Khulna",
      nameBn: "খুলনা",
      districts: [
        {
          id: "khulna",
          name: "Khulna",
          nameBn: "খুলনা",
          thanas: [
            { id: "khulna_sadar", name: "Khulna Sadar", nameBn: "খুলনা সদর" },
            { id: "daulatpur", name: "Daulatpur", nameBn: "দৌলতপুর" },
            { id: "khalishpur", name: "Khalishpur", nameBn: "খালিশপুর" },
            {
              id: "khan_jahan_ali",
              name: "Khan Jahan Ali",
              nameBn: "খান জাহান আলী",
            },
            { id: "kotwali", name: "Kotwali", nameBn: "কোতোয়ালী" },
          ],
        },
        {
          id: "jessore",
          name: "Jessore",
          nameBn: "যশোর",
          thanas: [
            { id: "jessore_sadar", name: "Jessore Sadar", nameBn: "যশোর সদর" },
            { id: "abhaynagar", name: "Abhaynagar", nameBn: "অভয়নগর" },
            { id: "bagherpara", name: "Bagherpara", nameBn: "বাঘারপাড়া" },
            { id: "chaugachha", name: "Chaugachha", nameBn: "চৌগাছা" },
            { id: "jhikargachha", name: "Jhikargachha", nameBn: "ঝিকরগাছা" },
          ],
        },
      ],
    },
    {
      id: "barisal",
      name: "Barisal",
      nameBn: "বরিশাল",
      districts: [
        {
          id: "barisal",
          name: "Barisal",
          nameBn: "বরিশাল",
          thanas: [
            {
              id: "barisal_sadar",
              name: "Barisal Sadar",
              nameBn: "বরিশাল সদর",
            },
            { id: "bakerganj", name: "Bakerganj", nameBn: "বাকেরগঞ্জ" },
            { id: "babuganj", name: "Babuganj", nameBn: "বাবুগঞ্জ" },
            { id: "banari_para", name: "Banari Para", nameBn: "বানারীপাড়া" },
            { id: "gournadi", name: "Gournadi", nameBn: "গৌরনদী" },
          ],
        },
        {
          id: "patuakhali",
          name: "Patuakhali",
          nameBn: "পটুয়াখালী",
          thanas: [
            {
              id: "patuakhali_sadar",
              name: "Patuakhali Sadar",
              nameBn: "পটুয়াখালী সদর",
            },
            { id: "bauphal", name: "Bauphal", nameBn: "বাউফল" },
            { id: "dashmina", name: "Dashmina", nameBn: "দশমিনা" },
            { id: "dumki", name: "Dumki", nameBn: "দুমকি" },
            { id: "galachipa", name: "Galachipa", nameBn: "গলাচিপা" },
          ],
        },
      ],
    },
    {
      id: "rangpur",
      name: "Rangpur",
      nameBn: "রংপুর",
      districts: [
        {
          id: "rangpur",
          name: "Rangpur",
          nameBn: "রংপুর",
          thanas: [
            { id: "rangpur_sadar", name: "Rangpur Sadar", nameBn: "রংপুর সদর" },
            { id: "badarganj", name: "Badarganj", nameBn: "বদরগঞ্জ" },
            { id: "gangachara", name: "Gangachara", nameBn: "গঙ্গাচড়া" },
            { id: "kaunia", name: "Kaunia", nameBn: "কাউনিয়া" },
            { id: "mithapukur", name: "Mithapukur", nameBn: "মিঠাপুকুর" },
          ],
        },
        {
          id: "dinajpur",
          name: "Dinajpur",
          nameBn: "দিনাজপুর",
          thanas: [
            {
              id: "dinajpur_sadar",
              name: "Dinajpur Sadar",
              nameBn: "দিনাজপুর সদর",
            },
            { id: "birampur", name: "Birampur", nameBn: "বীরামপুর" },
            { id: "birganj", name: "Birganj", nameBn: "বীরগঞ্জ" },
            { id: "bochaganj", name: "Bochaganj", nameBn: "বোচাগঞ্জ" },
            { id: "chirirbandar", name: "Chirirbandar", nameBn: "চিরিরবন্দর" },
          ],
        },
      ],
    },
    {
      id: "mymensingh",
      name: "Mymensingh",
      nameBn: "ময়মনসিংহ",
      districts: [
        {
          id: "mymensingh",
          name: "Mymensingh",
          nameBn: "ময়মনসিংহ",
          thanas: [
            {
              id: "mymensingh_sadar",
              name: "Mymensingh Sadar",
              nameBn: "ময়মনসিংহ সদর",
            },
            { id: "bhaluka", name: "Bhaluka", nameBn: "ভালুকা" },
            { id: "dhobaura", name: "Dhobaura", nameBn: "ধোবাউড়া" },
            { id: "fulbaria", name: "Fulbaria", nameBn: "ফুলবাড়ীয়া" },
            { id: "gaffargaon", name: "Gaffargaon", nameBn: "গফরগাঁও" },
          ],
        },
        {
          id: "jamalpur",
          name: "Jamalpur",
          nameBn: "জামালপুর",
          thanas: [
            {
              id: "jamalpur_sadar",
              name: "Jamalpur Sadar",
              nameBn: "জামালপুর সদর",
            },
            { id: "bakshiganj", name: "Bakshiganj", nameBn: "বকশীগঞ্জ" },
            { id: "dewanganj", name: "Dewanganj", nameBn: "দেওয়ানগঞ্জ" },
            { id: "islampur", name: "Islampur", nameBn: "ইসলামপুর" },
            { id: "madarganj", name: "Madarganj", nameBn: "মাদারগঞ্জ" },
          ],
        },
      ],
    },
  ],
};

/**
 * Get all divisions
 * @param {string} locale - Locale (bn-BD or en-US)
 * @returns {Array} - Array of divisions
 */
const getDivisions = (locale = "en-US") => {
  return bangladeshAddressData.divisions.map((division) => ({
    id: division.id,
    name: locale === "bn-BD" ? division.nameBn : division.name,
  }));
};

/**
 * Get districts by division
 * @param {string} divisionId - Division ID
 * @param {string} locale - Locale (bn-BD or en-US)
 * @returns {Array} - Array of districts
 */
const getDistrictsByDivision = (divisionId, locale = "en-US") => {
  const division = bangladeshAddressData.divisions.find(
    (d) => d.id === divisionId
  );
  if (!division) return [];

  return division.districts.map((district) => ({
    id: district.id,
    name: locale === "bn-BD" ? district.nameBn : district.name,
    divisionId: divisionId,
  }));
};

/**
 * Get thanas by district
 * @param {string} divisionId - Division ID
 * @param {string} districtId - District ID
 * @param {string} locale - Locale (bn-BD or en-US)
 * @returns {Array} - Array of thanas
 */
const getThanasByDistrict = (divisionId, districtId, locale = "en-US") => {
  const division = bangladeshAddressData.divisions.find(
    (d) => d.id === divisionId
  );
  if (!division) return [];

  const district = division.districts.find((d) => d.id === districtId);
  if (!district) return [];

  return district.thanas.map((thana) => ({
    id: thana.id,
    name: locale === "bn-BD" ? thana.nameBn : thana.name,
    districtId: districtId,
    divisionId: divisionId,
  }));
};

/**
 * Get all districts (flattened)
 * @param {string} locale - Locale (bn-BD or en-US)
 * @returns {Array} - Array of all districts
 */
const getAllDistricts = (locale = "en-US") => {
  const districts = [];

  bangladeshAddressData.divisions.forEach((division) => {
    division.districts.forEach((district) => {
      districts.push({
        id: district.id,
        name: locale === "bn-BD" ? district.nameBn : district.name,
        divisionId: division.id,
        divisionName: locale === "bn-BD" ? division.nameBn : division.name,
      });
    });
  });

  return districts;
};

/**
 * Get all thanas (flattened)
 * @param {string} locale - Locale (bn-BD or en-US)
 * @returns {Array} - Array of all thanas
 */
const getAllThanas = (locale = "en-US") => {
  const thanas = [];

  bangladeshAddressData.divisions.forEach((division) => {
    division.districts.forEach((district) => {
      district.thanas.forEach((thana) => {
        thanas.push({
          id: thana.id,
          name: locale === "bn-BD" ? thana.nameBn : thana.name,
          districtId: district.id,
          districtName: locale === "bn-BD" ? district.nameBn : district.name,
          divisionId: division.id,
          divisionName: locale === "bn-BD" ? division.nameBn : division.name,
        });
      });
    });
  });

  return thanas;
};

/**
 * Search locations by name
 * @param {string} query - Search query
 * @param {string} locale - Locale (bn-BD or en-US)
 * @returns {Object} - Search results
 */
const searchLocations = (query, locale = "en-US") => {
  const results = {
    divisions: [],
    districts: [],
    thanas: [],
  };

  const searchTerm = query.toLowerCase();

  bangladeshAddressData.divisions.forEach((division) => {
    const divisionName = (
      locale === "bn-BD" ? division.nameBn : division.name
    ).toLowerCase();

    // Search divisions
    if (divisionName.includes(searchTerm)) {
      results.divisions.push({
        id: division.id,
        name: locale === "bn-BD" ? division.nameBn : division.name,
        type: "division",
      });
    }

    division.districts.forEach((district) => {
      const districtName = (
        locale === "bn-BD" ? district.nameBn : district.name
      ).toLowerCase();

      // Search districts
      if (districtName.includes(searchTerm)) {
        results.districts.push({
          id: district.id,
          name: locale === "bn-BD" ? district.nameBn : district.name,
          divisionId: division.id,
          divisionName: locale === "bn-BD" ? division.nameBn : division.name,
          type: "district",
        });
      }

      district.thanas.forEach((thana) => {
        const thanaName = (
          locale === "bn-BD" ? thana.nameBn : thana.name
        ).toLowerCase();

        // Search thanas
        if (thanaName.includes(searchTerm)) {
          results.thanas.push({
            id: thana.id,
            name: locale === "bn-BD" ? thana.nameBn : thana.name,
            districtId: district.id,
            districtName: locale === "bn-BD" ? district.nameBn : district.name,
            divisionId: division.id,
            divisionName: locale === "bn-BD" ? division.nameBn : division.name,
            type: "thana",
          });
        }
      });
    });
  });

  return results;
};

/**
 * Validate Bangladesh address
 * @param {Object} address - Address object
 * @returns {Object} - Validation result
 */
const validateAddress = (address) => {
  const errors = [];
  const { division, district, thana } = address;

  // Check if division exists
  const divisionData = bangladeshAddressData.divisions.find(
    (d) => d.id === division
  );
  if (!divisionData) {
    errors.push("Invalid division");
    return { isValid: false, errors };
  }

  // Check if district exists in division
  const districtData = divisionData.districts.find((d) => d.id === district);
  if (!districtData) {
    errors.push("Invalid district for the selected division");
    return { isValid: false, errors };
  }

  // Check if thana exists in district
  const thanaData = districtData.thanas.find((t) => t.id === thana);
  if (!thanaData) {
    errors.push("Invalid thana for the selected district");
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
};

/**
 * Format complete address
 * @param {Object} address - Address object
 * @param {string} locale - Locale (bn-BD or en-US)
 * @returns {string} - Formatted address string
 */
const formatAddress = (address, locale = "en-US") => {
  const { street, thana, district, division, postalCode } = address;

  // Get location names
  const divisionData = bangladeshAddressData.divisions.find(
    (d) => d.id === division
  );
  const districtData = divisionData?.districts.find((d) => d.id === district);
  const thanaData = districtData?.thanas.find((t) => t.id === thana);

  const parts = [];

  if (street) parts.push(street);
  if (thanaData)
    parts.push(locale === "bn-BD" ? thanaData.nameBn : thanaData.name);
  if (districtData)
    parts.push(locale === "bn-BD" ? districtData.nameBn : districtData.name);
  if (divisionData)
    parts.push(locale === "bn-BD" ? divisionData.nameBn : divisionData.name);
  if (postalCode) parts.push(postalCode);

  return parts.join(", ");
};

module.exports = {
  getDivisions,
  getDistrictsByDivision,
  getThanasByDistrict,
  getAllDistricts,
  getAllThanas,
  searchLocations,
  validateAddress,
  formatAddress,
  bangladeshAddressData,
};
