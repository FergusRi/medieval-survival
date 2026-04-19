// ============================================================
// crops.js — Crop type definitions (Phase 14)
// ============================================================

export const CROPS = {
  wheat:       { name: 'Wheat',       wavesToHarvest: 2, yields: { food: 8 } },
  vegetables:  { name: 'Vegetables',  wavesToHarvest: 3, yields: { food: 15 } },
  barley:      { name: 'Barley',      wavesToHarvest: 4, yields: { food: 10, gold: 3 } },
  herbs:       { name: 'Herbs',       wavesToHarvest: 5, yields: { medicine: 5 } },
};
