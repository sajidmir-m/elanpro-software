const COMPONENT_CATEGORIES: Array<[string, RegExp]> = [
  ["Compressor", /\bcompressor\b/i],
  ["Power Port", /\bpower\s*port\b|\bpower\s*socket\b|\binlet\s*socket\b/i],
  ["Control Board / PCB", /\bpcb\b|\bcontrol\s*board\b|\bmain\s*board\b|\bmother\s*board\b/i],
  ["Display", /\bdisplay\b|\bdisplay\s*board\b|\bled\s*panel\b/i],
  ["Fan Motor", /\bfan\s*motor\b|\bblower\s*motor\b/i],
  ["Motor", /\bmotor\b/i],
  ["Condenser", /\bcondenser\b/i],
  ["Evaporator", /\bevaporator\b/i],
  ["Thermostat", /\bthermostat\b/i],
  ["Sensor", /\bsensor\b|\bthermistor\b|\bprobe\b/i],
  ["Relay", /\brelay\b|\boverload\b/i],
  ["Capacitor", /\bcapacitor\b/i],
  ["Valve", /\bvalve\b|\bsolenoid\b/i],
  ["Pump", /\bpump\b/i],
  ["Heater", /\bheater\b|\bheating\s*element\b/i],
  ["Filter", /\bfilter\b/i],
  ["Door / Lid", /\bdoor\b|\blid\b/i],
  ["Gasket / Seal", /\bgasket\b|\bseal\b/i],
  ["Handle", /\bhandle\b/i],
  ["Switch", /\bswitch\b|\bbutton\b|\bkeypad\b/i],
  ["Cable / Wiring", /\bcable\b|\bwire\b|\bwiring\b|\bharness\b|\bcord\b/i],
  ["Connector", /\bconnector\b|\bterminal\b|\bcoupler\b/i],
  ["Pipe / Tube", /\bpipe\b|\btube\b|\bhose\b|\bcapillary\b/i],
  ["Light / Lamp", /\blight\b|\blamp\b|\bbulb\b/i],
  ["Adapter / Power Supply", /\badapter\b|\bpower\s*supply\b|\bsmps\b/i],
  ["Battery", /\bbattery\b/i],
  ["Tray / Shelf", /\btray\b|\bshelf\b|\bbasket\b|\brack\b/i],
  ["Wheel / Caster", /\bwheel\b|\bcaster\b/i],
  ["Lock", /\block\b|\blatch\b/i],
];

/**
 * Converts a detailed spare description such as "Compressor L762 W" into
 * a stable family used for filtering and grouping, while preserving the
 * original description as the component/model.
 */
export function componentCategory(value: unknown): string {
  const name = String(value ?? "").trim();
  if (!name) return "Unspecified";

  for (const [category, pattern] of COMPONENT_CATEGORIES) {
    if (pattern.test(name)) return category;
  }

  const words = name
    .replace(/[_/()-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const family: string[] = [];

  for (const word of words) {
    if (/\d/.test(word) || /^[A-Z]{1,4}\d/i.test(word)) break;
    family.push(word);
    if (family.length === 2) break;
  }

  return family.length > 0 ? family.join(" ") : "Other Components";
}
