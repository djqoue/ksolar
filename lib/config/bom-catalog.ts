import type { BomCategory, BomLineItemTemplate, BomScenarioTemplate, CapacityTierId, SystemTopology } from "@/types/bom";

type QuantityMap = Partial<Record<CapacityTierId, number>>;

interface DetailedBomItem {
  id: string;
  category: BomCategory;
  name: string;
  model: string;
  unit: string;
  unitCostTHB: number;
  quantities: QuantityMap;
}

interface DetailedBomSheet {
  topology: SystemTopology;
  supportedTiers: CapacityTierId[];
  items: DetailedBomItem[];
}

function buildTemplateForTier(sheet: DetailedBomSheet, tierId: CapacityTierId): BomScenarioTemplate {
  const lineItems: BomLineItemTemplate[] = sheet.items
    .map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      model: item.model,
      unit: item.unit,
      unitCostTHB: item.unitCostTHB,
      quantity: item.quantities[tierId] || 0,
    }))
    .filter((item) => item.quantity > 0);

  return {
    topology: sheet.topology,
    tierId,
    lineItems,
  };
}

function createSheetTemplates(sheet: DetailedBomSheet) {
  return sheet.supportedTiers.map((tierId) => buildTemplateForTier(sheet, tierId));
}

const ONE_PHASE_PANEL_ITEM: DetailedBomItem = {
  id: "pv-module",
  category: "panel",
  name: "PV Module",
  model: "Trina Vertex N TSM-NEG19RC.20 (650W)",
  unit: "pcs",
  unitCostTHB: 2600,
  quantities: {
    "3kW": 5,
    "5kW": 8,
    "10kW": 16,
  },
};

const ONE_PHASE_MOUNTING_ITEMS: DetailedBomItem[] = [
  {
    id: "mount-rail",
    category: "mounting",
    name: "Aluminium Rail",
    model: "SE47 Rail L2400 (AI6005-T5)",
    unit: "pcs",
    unitCostTHB: 240,
    quantities: { "3kW": 6, "5kW": 8, "10kW": 16 },
  },
  {
    id: "mount-rail-splice",
    category: "mounting",
    name: "Rail Splice Kit",
    model: "Rail Splice Kit (AI6005-T5/SUS304)",
    unit: "pcs",
    unitCostTHB: 32,
    quantities: { "3kW": 4, "5kW": 6, "10kW": 12 },
  },
  {
    id: "mount-mid-clamp",
    category: "mounting",
    name: "Mid Clamp",
    model: "Mid Clamp 35/40 Kit",
    unit: "pcs",
    unitCostTHB: 13,
    quantities: { "3kW": 8, "5kW": 14, "10kW": 28 },
  },
  {
    id: "mount-end-clamp",
    category: "mounting",
    name: "End Clamp",
    model: "End Clamp 35/40 Kit",
    unit: "pcs",
    unitCostTHB: 13,
    quantities: { "3kW": 4, "5kW": 4, "10kW": 8 },
  },
  {
    id: "mount-tile-hook",
    category: "mounting",
    name: "Tile Hook",
    model: "Tile Hook for CPAC (AI6005-T5/SUS304)",
    unit: "pcs",
    unitCostTHB: 80,
    quantities: { "3kW": 10, "5kW": 16, "10kW": 32 },
  },
  {
    id: "mount-ground-washer",
    category: "mounting",
    name: "Ground Washer",
    model: "Ground Washer/Clip (SUS304)",
    unit: "pcs",
    unitCostTHB: 4,
    quantities: { "3kW": 5, "5kW": 8, "10kW": 16 },
  },
  {
    id: "mount-ground-lug",
    category: "mounting",
    name: "Ground Lug",
    model: "Ground Lug (AI6005-T5/SUS304)",
    unit: "pcs",
    unitCostTHB: 15,
    quantities: { "3kW": 2, "5kW": 2, "10kW": 4 },
  },
  {
    id: "mount-cable-clip",
    category: "mounting",
    name: "Cable Clip",
    model: "Cable Clip (SUS304)",
    unit: "pcs",
    unitCostTHB: 4,
    quantities: { "3kW": 10, "5kW": 16, "10kW": 32 },
  },
];

const ONE_PHASE_DC_ITEMS: DetailedBomItem[] = [
  {
    id: "dc-pv-cable",
    category: "electrical",
    name: "PV DC Cable",
    model: "PV Cable 4mm² (100m/Roll)",
    unit: "roll",
    unitCostTHB: 1600,
    quantities: { "3kW": 1, "5kW": 1, "10kW": 1 },
  },
  {
    id: "dc-mc4-pair",
    category: "electrical",
    name: "MC4 Connector Pair",
    model: "MC4 Connector Pair",
    unit: "pair",
    unitCostTHB: 12,
    quantities: { "3kW": 4, "5kW": 4, "10kW": 6 },
  },
  {
    id: "dc-mc4-branch",
    category: "electrical",
    name: "MC4 Branch",
    model: "MC4 Y(1-2) Branch",
    unit: "pcs",
    unitCostTHB: 60,
    quantities: { "10kW": 2 },
  },
  {
    id: "dc-spd",
    category: "electrical",
    name: "DC SPD",
    model: "DC SPD 2P 1000V",
    unit: "pcs",
    unitCostTHB: 180,
    quantities: { "3kW": 1, "5kW": 1, "10kW": 2 },
  },
  {
    id: "dc-breaker",
    category: "electrical",
    name: "DC Mini Circuit Breaker",
    model: "DC Mini Circuit Breaker 2P 1000V",
    unit: "pcs",
    unitCostTHB: 120,
    quantities: { "3kW": 1, "5kW": 1, "10kW": 2 },
  },
  {
    id: "dc-fuse-holder",
    category: "electrical",
    name: "DC Fuse Holder",
    model: "DC Fuse Holder 1P",
    unit: "pcs",
    unitCostTHB: 30,
    quantities: { "3kW": 2, "5kW": 2, "10kW": 4 },
  },
  {
    id: "dc-fuse-link",
    category: "electrical",
    name: "DC Fuse Link",
    model: "DC Fuse Link 20A",
    unit: "pcs",
    unitCostTHB: 25,
    quantities: { "3kW": 2, "5kW": 2, "10kW": 4 },
  },
];

const ONE_PHASE_AC_ONGRID_ITEMS: DetailedBomItem[] = [
  {
    id: "ac-spd-2p",
    category: "electrical",
    name: "AC SPD",
    model: "AC SPD 2P (DEHN)",
    unit: "pcs",
    unitCostTHB: 160,
    quantities: { "3kW": 1, "5kW": 1, "10kW": 1 },
  },
  {
    id: "ac-rcbo-2p",
    category: "electrical",
    name: "AC RCBO",
    model: "AC RCBO 2P 32A/30mA",
    unit: "pcs",
    unitCostTHB: 160,
    quantities: { "3kW": 1, "5kW": 1, "10kW": 1 },
  },
  {
    id: "ac-smart-meter-1p",
    category: "electrical",
    name: "Smart Meter",
    model: "SDM120CT(40ma) 1P Smart Meter",
    unit: "pcs",
    unitCostTHB: 2100,
    quantities: { "3kW": 1, "5kW": 1, "10kW": 1 },
  },
  {
    id: "ac-cable-1p",
    category: "electrical",
    name: "AC Cable",
    model: "AC Cable 2.5mm² (estimated)",
    unit: "lot",
    unitCostTHB: 500,
    quantities: { "3kW": 1, "5kW": 1, "10kW": 1 },
  },
];

const ONE_PHASE_AC_HYBRID_ITEMS: DetailedBomItem[] = [
  ...ONE_PHASE_AC_ONGRID_ITEMS.slice(0, 3),
  {
    id: "ac-ats-2p",
    category: "electrical",
    name: "Automatic Transfer Switch",
    model: "ATS 2P 63A",
    unit: "pcs",
    unitCostTHB: 420,
    quantities: { "3kW": 1, "5kW": 1, "10kW": 1 },
  },
  ONE_PHASE_AC_ONGRID_ITEMS[3],
];

const THREE_PHASE_PANEL_ITEM: DetailedBomItem = {
  id: "pv-module",
  category: "panel",
  name: "PV Module",
  model: "Trina Vertex N TSM-NEG19RC.20 (650W)",
  unit: "pcs",
  unitCostTHB: 2600,
  quantities: {
    "5kW": 8,
    "10kW": 16,
    "15kW": 24,
    "20kW": 31,
  },
};

const THREE_PHASE_MOUNTING_ITEMS: DetailedBomItem[] = [
  {
    id: "mount-rail",
    category: "mounting",
    name: "Aluminium Rail",
    model: "SE47 Rail L2400 (AI6005-T5)",
    unit: "pcs",
    unitCostTHB: 240,
    quantities: { "5kW": 8, "10kW": 16, "15kW": 24, "20kW": 36 },
  },
  {
    id: "mount-rail-splice",
    category: "mounting",
    name: "Rail Splice Kit",
    model: "Rail Splice Kit (AI6005-T5/SUS304)",
    unit: "pcs",
    unitCostTHB: 32,
    quantities: { "5kW": 6, "10kW": 12, "15kW": 18, "20kW": 30 },
  },
  {
    id: "mount-mid-clamp",
    category: "mounting",
    name: "Mid Clamp",
    model: "Mid Clamp 35/40 Kit",
    unit: "pcs",
    unitCostTHB: 13,
    quantities: { "5kW": 14, "10kW": 28, "15kW": 42, "20kW": 60 },
  },
  {
    id: "mount-end-clamp",
    category: "mounting",
    name: "End Clamp",
    model: "End Clamp 35/40 Kit",
    unit: "pcs",
    unitCostTHB: 13,
    quantities: { "5kW": 4, "10kW": 8, "15kW": 12, "20kW": 12 },
  },
  {
    id: "mount-tile-hook",
    category: "mounting",
    name: "Tile Hook",
    model: "Tile Hook for CPAC (AI6005-T5/SUS304)",
    unit: "pcs",
    unitCostTHB: 80,
    quantities: { "5kW": 16, "10kW": 32, "15kW": 48, "20kW": 62 },
  },
  {
    id: "mount-ground-washer",
    category: "mounting",
    name: "Ground Washer",
    model: "Ground Washer/Clip (SUS304)",
    unit: "pcs",
    unitCostTHB: 4,
    quantities: { "5kW": 8, "10kW": 16, "15kW": 24, "20kW": 31 },
  },
  {
    id: "mount-ground-lug",
    category: "mounting",
    name: "Ground Lug",
    model: "Ground Lug (AI6005-T5/SUS304)",
    unit: "pcs",
    unitCostTHB: 15,
    quantities: { "5kW": 2, "10kW": 4, "15kW": 6, "20kW": 6 },
  },
  {
    id: "mount-cable-clip",
    category: "mounting",
    name: "Cable Clip",
    model: "Cable Clip (SUS304)",
    unit: "pcs",
    unitCostTHB: 4,
    quantities: { "5kW": 16, "10kW": 32, "15kW": 48, "20kW": 62 },
  },
];

const THREE_PHASE_DC_ITEMS: DetailedBomItem[] = [
  {
    id: "dc-pv-cable",
    category: "electrical",
    name: "PV DC Cable",
    model: "PV Cable 6mm² (100m/Roll)",
    unit: "roll",
    unitCostTHB: 2200,
    quantities: { "5kW": 1, "10kW": 1, "15kW": 1, "20kW": 2 },
  },
  {
    id: "dc-mc4-pair",
    category: "electrical",
    name: "MC4 Connector Pair",
    model: "MC4 Connector Pair",
    unit: "pair",
    unitCostTHB: 12,
    quantities: { "5kW": 4, "10kW": 6, "15kW": 6, "20kW": 6 },
  },
  {
    id: "dc-mc4-branch",
    category: "electrical",
    name: "MC4 Branch",
    model: "MC4 Y(1-2) Branch",
    unit: "pcs",
    unitCostTHB: 60,
    quantities: { "10kW": 2, "15kW": 2, "20kW": 2 },
  },
  {
    id: "dc-spd",
    category: "electrical",
    name: "DC SPD",
    model: "DC SPD 2P 1000V",
    unit: "pcs",
    unitCostTHB: 180,
    quantities: { "5kW": 1, "10kW": 2, "15kW": 2, "20kW": 2 },
  },
  {
    id: "dc-breaker",
    category: "electrical",
    name: "DC Mini Circuit Breaker",
    model: "DC Mini Circuit Breaker 2P 1000V",
    unit: "pcs",
    unitCostTHB: 120,
    quantities: { "5kW": 1, "10kW": 2, "15kW": 2, "20kW": 2 },
  },
  {
    id: "dc-fuse-holder",
    category: "electrical",
    name: "DC Fuse Holder",
    model: "DC Fuse Holder 1P",
    unit: "pcs",
    unitCostTHB: 30,
    quantities: { "5kW": 2, "10kW": 4, "15kW": 4, "20kW": 4 },
  },
  {
    id: "dc-fuse-link",
    category: "electrical",
    name: "DC Fuse Link",
    model: "DC Fuse Link 20A",
    unit: "pcs",
    unitCostTHB: 25,
    quantities: { "5kW": 2, "10kW": 4, "15kW": 4, "20kW": 4 },
  },
];

const THREE_PHASE_AC_ONGRID_ITEMS: DetailedBomItem[] = [
  {
    id: "ac-spd-4p",
    category: "electrical",
    name: "AC SPD",
    model: "AC SPD 4P (DEHN)",
    unit: "pcs",
    unitCostTHB: 280,
    quantities: { "5kW": 1, "10kW": 1, "15kW": 1, "20kW": 1 },
  },
  {
    id: "ac-rcbo-4p",
    category: "electrical",
    name: "AC RCBO",
    model: "AC RCBO 4P 32A/30mA",
    unit: "pcs",
    unitCostTHB: 160,
    quantities: { "5kW": 1, "10kW": 1, "15kW": 1, "20kW": 1 },
  },
  {
    id: "ac-smart-meter-3p",
    category: "electrical",
    name: "Smart Meter",
    model: "SDM630MCT 3P Smart Meter",
    unit: "pcs",
    unitCostTHB: 3200,
    quantities: { "5kW": 1, "10kW": 1, "15kW": 1, "20kW": 1 },
  },
  {
    id: "ac-cable-3p",
    category: "electrical",
    name: "AC Cable",
    model: "AC Cable 4mm² (estimated)",
    unit: "lot",
    unitCostTHB: 800,
    quantities: { "5kW": 1, "10kW": 1, "15kW": 1, "20kW": 1 },
  },
];

const THREE_PHASE_AC_HYBRID_ITEMS: DetailedBomItem[] = [
  ...THREE_PHASE_AC_ONGRID_ITEMS.slice(0, 3),
  {
    id: "ac-ats-4p",
    category: "electrical",
    name: "Automatic Transfer Switch",
    model: "ATS 4P 63A",
    unit: "pcs",
    unitCostTHB: 530,
    quantities: { "5kW": 1, "10kW": 1, "15kW": 1, "20kW": 1 },
  },
  THREE_PHASE_AC_ONGRID_ITEMS[3],
];

const ONE_PHASE_ONGRID_INVERTERS: DetailedBomItem[] = [
  {
    id: "inverter-3kw-1p-on-grid",
    category: "inverter",
    name: "On-Grid Inverter",
    model: "SUN-3K-G04P1-EU-AM1 (1P/3kW)",
    unit: "pcs",
    unitCostTHB: 8400,
    quantities: { "3kW": 1 },
  },
  {
    id: "inverter-5kw-1p-on-grid",
    category: "inverter",
    name: "On-Grid Inverter",
    model: "SUN-5K-G05P1-EU-AM2 (1P/5kW)",
    unit: "pcs",
    unitCostTHB: 12100,
    quantities: { "5kW": 1 },
  },
  {
    id: "inverter-10kw-1p-on-grid",
    category: "inverter",
    name: "On-Grid Inverter",
    model: "SUN-10K-G02P1-EU-AM2 (1P/10kW)",
    unit: "pcs",
    unitCostTHB: 19800,
    quantities: { "10kW": 1 },
  },
];

const ONE_PHASE_HYBRID_INVERTERS: DetailedBomItem[] = [
  {
    id: "inverter-3kw-1p-hybrid",
    category: "inverter",
    name: "Hybrid Inverter",
    model: "SUN-5K-SG04LP1-EU-SM2 (1P/5kW HY)",
    unit: "pcs",
    unitCostTHB: 23500,
    quantities: { "3kW": 1 },
  },
  {
    id: "inverter-5kw-1p-hybrid",
    category: "inverter",
    name: "Hybrid Inverter",
    model: "SUN-5K-SG04LP1-EU-SM2 (1P/5kW HY)",
    unit: "pcs",
    unitCostTHB: 23500,
    quantities: { "5kW": 1 },
  },
  {
    id: "inverter-10kw-1p-hybrid",
    category: "inverter",
    name: "Hybrid Inverter",
    model: "SUN-10K-SG05LP1-EU (1P/10kW HY)",
    unit: "pcs",
    unitCostTHB: 46700,
    quantities: { "10kW": 1 },
  },
];

const ONE_PHASE_HYBRID_BATTERY_ITEMS: DetailedBomItem[] = [
  {
    id: "battery-3kw-1p",
    category: "battery",
    name: "Battery Pack",
    model: "Genixgreen ES-BOX12 (5.12kWh)",
    unit: "pcs",
    unitCostTHB: 21000,
    quantities: { "3kW": 1 },
  },
  {
    id: "battery-5kw-1p",
    category: "battery",
    name: "Battery Pack",
    model: "Genixgreen ES-BOX12 (5.12kWh)",
    unit: "pcs",
    unitCostTHB: 21000,
    quantities: { "5kW": 1 },
  },
  {
    id: "battery-10kw-1p",
    category: "battery",
    name: "Battery Pack",
    model: "Genixgreen ES-BOX12 Plus (10.24kWh)",
    unit: "pcs",
    unitCostTHB: 40000,
    quantities: { "10kW": 1 },
  },
  {
    id: "battery-cable-3kw-1p",
    category: "battery",
    name: "Battery Cable",
    model: "Battery Cable 10AWG",
    unit: "set",
    unitCostTHB: 350,
    quantities: { "3kW": 1 },
  },
  {
    id: "battery-cable-5kw-1p",
    category: "battery",
    name: "Battery Cable",
    model: "Battery Cable 10AWG",
    unit: "set",
    unitCostTHB: 350,
    quantities: { "5kW": 1 },
  },
  {
    id: "battery-cable-10kw-1p",
    category: "battery",
    name: "Battery Cable",
    model: "Battery Cable 10AWG",
    unit: "set",
    unitCostTHB: 350,
    quantities: { "10kW": 1 },
  },
];

const THREE_PHASE_ONGRID_INVERTERS: DetailedBomItem[] = [
  {
    id: "inverter-5kw-3p-on-grid",
    category: "inverter",
    name: "On-Grid Inverter",
    model: "SUN-6K-G06P3-EU-BM2-P1 (3P/6kW)",
    unit: "pcs",
    unitCostTHB: 16300,
    quantities: { "5kW": 1 },
  },
  {
    id: "inverter-10kw-3p-on-grid",
    category: "inverter",
    name: "On-Grid Inverter",
    model: "SUN-10K-G06P3-EU-BM2-P1 (3P/10kW)",
    unit: "pcs",
    unitCostTHB: 17800,
    quantities: { "10kW": 1 },
  },
  {
    id: "inverter-15kw-3p-on-grid",
    category: "inverter",
    name: "On-Grid Inverter",
    model: "SUN-15K-G06P3-EU-BM2-P1 (3P/15kW)",
    unit: "pcs",
    unitCostTHB: 24300,
    quantities: { "15kW": 1 },
  },
  {
    id: "inverter-20kw-3p-on-grid",
    category: "inverter",
    name: "On-Grid Inverter",
    model: "SUN-20K-G05 (3P/20kW)",
    unit: "pcs",
    unitCostTHB: 27500,
    quantities: { "20kW": 1 },
  },
];

const THREE_PHASE_HYBRID_INVERTERS: DetailedBomItem[] = [
  {
    id: "inverter-5kw-3p-hybrid",
    category: "inverter",
    name: "Hybrid Inverter",
    model: "SUN-5K-SG05LP3-EU-SM2 (3P/5kW HY)",
    unit: "pcs",
    unitCostTHB: 45800,
    quantities: { "5kW": 1 },
  },
  {
    id: "inverter-10kw-3p-hybrid",
    category: "inverter",
    name: "Hybrid Inverter",
    model: "SUN-10K-SG04LP3-EU (3P/10kW HY)",
    unit: "pcs",
    unitCostTHB: 56500,
    quantities: { "10kW": 1 },
  },
  {
    id: "inverter-15kw-3p-hybrid",
    category: "inverter",
    name: "Hybrid Inverter",
    model: "SUN-15K-SG05LP3-EU-SM2 (3P/15kW HY)",
    unit: "pcs",
    unitCostTHB: 62800,
    quantities: { "15kW": 1 },
  },
  {
    id: "inverter-20kw-3p-hybrid",
    category: "inverter",
    name: "Hybrid Inverter",
    model: "SUN-20K-SG05LP3-EU-SM2 (3P/20kW HY)",
    unit: "pcs",
    unitCostTHB: 84000,
    quantities: { "20kW": 1 },
  },
];

const THREE_PHASE_HYBRID_BATTERY_ITEMS: DetailedBomItem[] = [
  {
    id: "battery-5kw-3p",
    category: "battery",
    name: "Battery Pack",
    model: "Genixgreen ES-BOX12 (5.12kWh)",
    unit: "pcs",
    unitCostTHB: 21000,
    quantities: { "5kW": 1 },
  },
  {
    id: "battery-10kw-3p",
    category: "battery",
    name: "Battery Pack",
    model: "Genixgreen ES-BOX12 Plus (10.24kWh)",
    unit: "pcs",
    unitCostTHB: 40000,
    quantities: { "10kW": 1 },
  },
  {
    id: "battery-15kw-3p",
    category: "battery",
    name: "Battery Pack",
    model: "Genixgreen ES-BOX36 MAX+ (16kWh)",
    unit: "pcs",
    unitCostTHB: 50500,
    quantities: { "15kW": 1 },
  },
  {
    id: "battery-20kw-3p",
    category: "battery",
    name: "Battery Pack",
    model: "Genixgreen ES-BOX36 MAX+ (16kWh)",
    unit: "pcs",
    unitCostTHB: 50500,
    quantities: { "20kW": 1 },
  },
  {
    id: "battery-cable-5kw-3p",
    category: "battery",
    name: "Battery Cable",
    model: "Battery Cable 10AWG",
    unit: "set",
    unitCostTHB: 350,
    quantities: { "5kW": 1 },
  },
  {
    id: "battery-cable-10kw-3p",
    category: "battery",
    name: "Battery Cable",
    model: "Battery Cable 10AWG",
    unit: "set",
    unitCostTHB: 350,
    quantities: { "10kW": 1 },
  },
  {
    id: "battery-cable-15kw-3p",
    category: "battery",
    name: "Battery Cable",
    model: "Battery Cable 10AWG",
    unit: "set",
    unitCostTHB: 350,
    quantities: { "15kW": 2 },
  },
  {
    id: "battery-cable-20kw-3p",
    category: "battery",
    name: "Battery Cable",
    model: "Battery Cable 10AWG",
    unit: "set",
    unitCostTHB: 350,
    quantities: { "20kW": 2 },
  },
];

const DETAILED_SHEETS: DetailedBomSheet[] = [
  {
    topology: { phase: "1P", mode: "ongrid", batteryMode: "none" },
    supportedTiers: ["3kW", "5kW", "10kW"],
    items: [
      ONE_PHASE_PANEL_ITEM,
      ...ONE_PHASE_ONGRID_INVERTERS,
      ...ONE_PHASE_MOUNTING_ITEMS,
      ...ONE_PHASE_DC_ITEMS,
      ...ONE_PHASE_AC_ONGRID_ITEMS,
    ],
  },
  {
    topology: { phase: "1P", mode: "hybrid", batteryMode: "none" },
    supportedTiers: ["3kW", "5kW", "10kW"],
    items: [
      ONE_PHASE_PANEL_ITEM,
      ...ONE_PHASE_HYBRID_INVERTERS,
      ...ONE_PHASE_MOUNTING_ITEMS,
      ...ONE_PHASE_DC_ITEMS,
      ...ONE_PHASE_AC_HYBRID_ITEMS,
    ],
  },
  {
    topology: { phase: "1P", mode: "hybrid", batteryMode: "with_battery" },
    supportedTiers: ["3kW", "5kW", "10kW"],
    items: [
      ONE_PHASE_PANEL_ITEM,
      ...ONE_PHASE_HYBRID_INVERTERS,
      ...ONE_PHASE_HYBRID_BATTERY_ITEMS,
      ...ONE_PHASE_MOUNTING_ITEMS,
      ...ONE_PHASE_DC_ITEMS,
      ...ONE_PHASE_AC_HYBRID_ITEMS,
    ],
  },
  {
    topology: { phase: "3P", mode: "ongrid", batteryMode: "none" },
    supportedTiers: ["5kW", "10kW", "15kW", "20kW"],
    items: [
      THREE_PHASE_PANEL_ITEM,
      ...THREE_PHASE_ONGRID_INVERTERS,
      ...THREE_PHASE_MOUNTING_ITEMS,
      ...THREE_PHASE_DC_ITEMS,
      ...THREE_PHASE_AC_ONGRID_ITEMS,
    ],
  },
  {
    topology: { phase: "3P", mode: "hybrid", batteryMode: "none" },
    supportedTiers: ["5kW", "10kW", "15kW", "20kW"],
    items: [
      THREE_PHASE_PANEL_ITEM,
      ...THREE_PHASE_HYBRID_INVERTERS,
      ...THREE_PHASE_MOUNTING_ITEMS,
      ...THREE_PHASE_DC_ITEMS,
      ...THREE_PHASE_AC_HYBRID_ITEMS,
    ],
  },
  {
    topology: { phase: "3P", mode: "hybrid", batteryMode: "with_battery" },
    supportedTiers: ["5kW", "10kW", "15kW", "20kW"],
    items: [
      THREE_PHASE_PANEL_ITEM,
      ...THREE_PHASE_HYBRID_INVERTERS,
      ...THREE_PHASE_HYBRID_BATTERY_ITEMS,
      ...THREE_PHASE_MOUNTING_ITEMS,
      ...THREE_PHASE_DC_ITEMS,
      ...THREE_PHASE_AC_HYBRID_ITEMS,
    ],
  },
];

export const BOM_CATALOG: BomScenarioTemplate[] = DETAILED_SHEETS.flatMap(createSheetTemplates);
