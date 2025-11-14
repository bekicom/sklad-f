// Unit helpers and conversion factors
// If your business defines a different conversion for "blok", update the factor below.
export const UNIT_MAP = {
  kg: { factor: 1, base: "kg" },
  dona: { factor: 1, base: "dona" },
  blok: { factor: 10, base: "dona" }, // <-- change factor if 1 blok != 10 dona
  metr: { factor: 1, base: "metr" },
  l: { factor: 1, base: "l" },
  m: { factor: 1, base: "m" },
};

const key = (unit) => (unit || "").toString().toLowerCase().trim();

export function getUnitFactor(unit) {
  const k = key(unit);
  return UNIT_MAP[k] ? UNIT_MAP[k].factor : 1;
}

export function getBaseUnit(unit) {
  const k = key(unit);
  return UNIT_MAP[k] ? UNIT_MAP[k].base : unit;
}

export function convertToBase(quantity, unit) {
  const f = getUnitFactor(unit);
  return Number(quantity || 0) * f;
}

export function normalizeUnit(unit) {
  return key(unit);
}
