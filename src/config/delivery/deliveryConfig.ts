export type DeliveryCountryCode = "JM" | "US" | "CA" | "AE";

export type DeliveryRegionOption = {
  code: string;
  label: string;
};

export type StablePickupLocation = {
  id: string;
  label: string;
  parishOrRegion: string;
  countryCode: DeliveryCountryCode;
  nextVisitDate: string;
  pickupWindowLabel: string;
  notes?: string;
};

export type PopupShopLocation = {
  id: string;
  label: string;
  parishOrRegion: string;
  countryCode: DeliveryCountryCode;
  eventDate: string;
  eventDateLabel: string;
  notes?: string;
};

export type DeliveryZoneRate = {
  countryCode: DeliveryCountryCode;
  regionCode: string;
  regionLabel: string;
  feeJmd: number;
  notes?: string;
};

export type DeliveryConfig = {
  countries: Array<{
    code: DeliveryCountryCode;
    label: string;
  }>;
  regionOptions: Record<DeliveryCountryCode, DeliveryRegionOption[]>;
  stablePickupLocations: StablePickupLocation[];
  popupShopLocations: PopupShopLocation[];
  deliveryZoneRates: DeliveryZoneRate[];
};

export const deliveryConfig: DeliveryConfig = {
  countries: [
    { code: "JM", label: "Jamaica" },
    { code: "US", label: "United States" },
    { code: "CA", label: "Canada" },
    { code: "AE", label: "UAE" },
  ],

  regionOptions: {
    JM: [
      { code: "KSA", label: "Kingston" },
      { code: "SCT", label: "St. Catherine" },
      { code: "STM", label: "St. Thomas" },
      { code: "POR", label: "Portland" },
      { code: "STA", label: "St. Andrew" },
      { code: "MCH", label: "Manchester" },
      { code: "STJ", label: "St. James" },
      { code: "HAN", label: "Hanover" },
      { code: "WML", label: "Westmoreland" },
      { code: "TRL", label: "Trelawny" },
      { code: "SAB", label: "St. Ann" },
      { code: "STE", label: "St. Elizabeth" },
      { code: "CLA", label: "Clarendon" },
      { code: "MRY", label: "St. Mary" },
    ],
    US: [
      { code: "FL", label: "Florida" },
      { code: "NY", label: "New York" },
      { code: "GA", label: "Georgia" },
      { code: "TX", label: "Texas" },
      { code: "NJ", label: "New Jersey" },
      { code: "CA", label: "California" },
    ],
    CA: [
      { code: "ON", label: "Ontario" },
      { code: "QC", label: "Quebec" },
      { code: "BC", label: "British Columbia" },
      { code: "AB", label: "Alberta" },
      { code: "MB", label: "Manitoba" },
      { code: "NS", label: "Nova Scotia" },
    ],
    AE: [
      { code: "DU", label: "Dubai" },
      { code: "AZ", label: "Abu Dhabi" },
      { code: "SH", label: "Sharjah" },
      { code: "AJ", label: "Ajman" },
      { code: "RA", label: "Ras Al Khaimah" },
      { code: "FU", label: "Fujairah" },
      { code: "UQ", label: "Umm Al Quwain" },
    ],
  },

  stablePickupLocations: [
    {
      id: "sovereign-liguanea",
      label: "Sovereign Centre, Liguanea",
      parishOrRegion: "St. Andrew",
      countryCode: "JM",
      nextVisitDate: "2026-04-10T09:00:00-05:00",
      pickupWindowLabel: "Friday, April 10, 2026, between 12:00 PM and 2:00 PM",
      notes: "Pickup after our stop is set up and confirmed.",
    },
    {
      id: "devon-house",
      label: "Devon House",
      parishOrRegion: "Kingston",
      countryCode: "JM",
      nextVisitDate: "2026-04-09T11:00:00-05:00",
      pickupWindowLabel: "Thursday, April 9, 2026, between 11:00 AM and 3:00 PM",
      notes: "Bring your order confirmation when collecting.",
    },
    {
      id: "sovereign-portmore",
      label: "Sovereign Village, Portmore",
      parishOrRegion: "St. Catherine",
      countryCode: "JM",
      nextVisitDate: "2026-04-11T10:00:00-05:00",
      pickupWindowLabel: "Saturday, April 11, 2026, between 12:00 PM and 2:00 PM",
      notes: "Portmore pickup stop for pre-confirmed orders.",
    },
  ],

  popupShopLocations: [
    {
      id: "popup-kingston-apr-2026",
      label: "Next Pop-up Shop — Kingston",
      parishOrRegion: "Kingston",
      countryCode: "JM",
      eventDate: "2026-04-25T10:00:00-05:00",
      eventDateLabel: "Saturday, April 25, 2026",
      notes: "Last weekend pop-up for Kingston customers.",
    },
    {
      id: "popup-portmore-may-2026",
      label: "Next Pop-up Shop — Portmore",
      parishOrRegion: "St. Catherine",
      countryCode: "JM",
      eventDate: "2026-05-30T10:00:00-05:00",
      eventDateLabel: "Saturday, May 30, 2026",
      notes: "Last weekend pop-up for Portmore customers.",
    },
    {
      id: "popup-montego-bay-jun-2026",
      label: "Next Pop-up Shop — Montego Bay",
      parishOrRegion: "St. James",
      countryCode: "JM",
      eventDate: "2026-06-27T10:00:00-05:00",
      eventDateLabel: "Saturday, June 27, 2026",
      notes: "Last weekend pop-up for western Jamaica customers.",
    },
  ],

  deliveryZoneRates: [
    { countryCode: "JM", regionCode: "KSA", regionLabel: "Kingston", feeJmd: 700 },
    { countryCode: "JM", regionCode: "STA", regionLabel: "St. Andrew", feeJmd: 700 },
    { countryCode: "JM", regionCode: "SCT", regionLabel: "St. Catherine", feeJmd: 850 },
    { countryCode: "JM", regionCode: "CLA", regionLabel: "Clarendon", feeJmd: 1200 },
    { countryCode: "JM", regionCode: "MCH", regionLabel: "Manchester", feeJmd: 1800 },
    { countryCode: "JM", regionCode: "STE", regionLabel: "St. Elizabeth", feeJmd: 1800 },
    { countryCode: "JM", regionCode: "SAB", regionLabel: "St. Ann", feeJmd: 1600 },
    { countryCode: "JM", regionCode: "MRY", regionLabel: "St. Mary", feeJmd: 1600 },
    { countryCode: "JM", regionCode: "POR", regionLabel: "Portland", feeJmd: 2200 },
    { countryCode: "JM", regionCode: "STM", regionLabel: "St. Thomas", feeJmd: 1500 },
    { countryCode: "JM", regionCode: "STJ", regionLabel: "St. James", feeJmd: 2200 },
    { countryCode: "JM", regionCode: "TRL", regionLabel: "Trelawny", feeJmd: 2200 },
    { countryCode: "JM", regionCode: "HAN", regionLabel: "Hanover", feeJmd: 2400 },
    { countryCode: "JM", regionCode: "WML", regionLabel: "Westmoreland", feeJmd: 2400 },

    { countryCode: "US", regionCode: "FL", regionLabel: "Florida", feeJmd: 6500 },
    { countryCode: "US", regionCode: "NY", regionLabel: "New York", feeJmd: 8500 },
    { countryCode: "US", regionCode: "GA", regionLabel: "Georgia", feeJmd: 7200 },
    { countryCode: "US", regionCode: "TX", regionLabel: "Texas", feeJmd: 9000 },
    { countryCode: "US", regionCode: "NJ", regionLabel: "New Jersey", feeJmd: 8400 },
    { countryCode: "US", regionCode: "CA", regionLabel: "California", feeJmd: 9800 },

    { countryCode: "CA", regionCode: "ON", regionLabel: "Ontario", feeJmd: 8800 },
    { countryCode: "CA", regionCode: "QC", regionLabel: "Quebec", feeJmd: 9000 },
    { countryCode: "CA", regionCode: "BC", regionLabel: "British Columbia", feeJmd: 9800 },
    { countryCode: "CA", regionCode: "AB", regionLabel: "Alberta", feeJmd: 9500 },
    { countryCode: "CA", regionCode: "MB", regionLabel: "Manitoba", feeJmd: 9300 },
    { countryCode: "CA", regionCode: "NS", regionLabel: "Nova Scotia", feeJmd: 9200 },

    { countryCode: "AE", regionCode: "DU", regionLabel: "Dubai", feeJmd: 12500 },
    { countryCode: "AE", regionCode: "AZ", regionLabel: "Abu Dhabi", feeJmd: 12800 },
    { countryCode: "AE", regionCode: "SH", regionLabel: "Sharjah", feeJmd: 12600 },
    { countryCode: "AE", regionCode: "AJ", regionLabel: "Ajman", feeJmd: 12600 },
    { countryCode: "AE", regionCode: "RA", regionLabel: "Ras Al Khaimah", feeJmd: 13200 },
    { countryCode: "AE", regionCode: "FU", regionLabel: "Fujairah", feeJmd: 13400 },
    { countryCode: "AE", regionCode: "UQ", regionLabel: "Umm Al Quwain", feeJmd: 13000 },
  ],
};