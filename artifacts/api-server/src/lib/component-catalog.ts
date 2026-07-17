export type ComponentCatalogRow = {
  component_category: string;
  component_model: string;
  part_code: string;
  product_models: string;
  product_categories: string;
  total_consumed: number;
  request_count: number;
};

const COMPONENT_FAMILIES: Array<{ family: string; patterns: RegExp[] }> = [
  { family: "Compressor", patterns: [/\bcompressor\b/i] },
  {
    family: "Fan Motor",
    patterns: [/\bfan\s*motor\b/i, /\baxial\s*fan\b/i, /\bblower\s*motor\b/i, /\bconden[cs]or\s*fan\b/i],
  },
  {
    family: "Controller / Thermostat",
    patterns: [/\bthermostat\b/i, /\bcontroller\b/i, /\bcontrol(?:ler)?\s*board\b/i],
  },
  {
    family: "PCB / Display Board",
    patterns: [/\bpc\s*board\b/i, /\bpcb\b/i, /\bdisplay\s*board\b/i, /\bmother\s*board\b/i],
  },
  {
    family: "Relay / Capacitor",
    patterns: [/\brelay\b/i, /\bcapacitor\b/i, /\boverload\b/i],
  },
  {
    family: "Sensor",
    patterns: [/\bsensor\b/i, /\bprobe\b/i],
  },
  {
    family: "Power Supply / Adapter",
    patterns: [/\badopt?er\b/i, /\badapter\b/i, /\bpower\s*(?:supply|cord|cable|port)\b/i, /\bsmps\b/i],
  },
  {
    family: "Condenser / Evaporator",
    patterns: [/\bconden[cs]er\b/i, /\bevaporator\b/i, /\bcooling\s*coil\b/i],
  },
  {
    family: "Pump",
    patterns: [/\bpump\b/i],
  },
  {
    family: "Valve",
    patterns: [/\bvalve\b/i, /\bsolenoid\b/i],
  },
  {
    family: "Heater",
    patterns: [/\bheater\b/i, /\bheating\s*element\b/i],
  },
  {
    family: "Lighting",
    patterns: [/\bled\b/i, /\blight\b/i, /\blamp\b/i],
  },
  {
    family: "Door / Handle",
    patterns: [/\bdoor\b/i, /\bhandle\b/i, /\bhinge\b/i, /\block\b/i],
  },
  {
    family: "Gasket / Seal",
    patterns: [/\bgasket\b/i, /\bo[\s-]?ring\b/i, /\bseal\b/i],
  },
  {
    family: "Filter",
    patterns: [/\bfilter\b/i, /\bstrainer\b/i],
  },
  {
    family: "Tray / Container",
    patterns: [/\btray\b/i, /\bbottle\s*holder\b/i, /\bcontainer\b/i, /\bbin\b/i],
  },
  {
    family: "Switch",
    patterns: [/\bswitch\b/i, /\bmicroswitch\b/i],
  },
  {
    family: "Wheel / Castor",
    patterns: [/\bwheel\b/i, /\bcastor\b/i, /\bcaster\b/i],
  },
  {
    family: "Pipe / Fitting",
    patterns: [/\bpipe\b/i, /\btube\b/i, /\bhose\b/i, /\bfitting\b/i, /\bconnector\b/i],
  },
];

function clean(value: unknown, fallback = "Unknown"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function componentFamily(value: unknown): string {
  const name = clean(value);
  for (const entry of COMPONENT_FAMILIES) {
    if (entry.patterns.some((pattern) => pattern.test(name))) return entry.family;
  }

  const firstWords = name
    .replace(/[()]/g, " ")
    .split(/[\s\-/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  return firstWords || "Other";
}

export function buildComponentCatalog(rows: Record<string, unknown>[]): ComponentCatalogRow[] {
  type Group = {
    component_category: string;
    component_model: string;
    part_code: string;
    products: Set<string>;
    categories: Set<string>;
    total_consumed: number;
    requests: Set<string>;
  };

  const groups = new Map<string, Group>();

  for (const row of rows) {
    const componentModel = clean(row.component_name);
    const partCode = clean(row.part_code, "—");
    const category = componentFamily(componentModel);
    const key = `${category.toLowerCase()}|||${componentModel.toLowerCase()}|||${partCode.toLowerCase()}`;
    const current = groups.get(key) ?? {
      component_category: category,
      component_model: componentModel,
      part_code: partCode,
      products: new Set<string>(),
      categories: new Set<string>(),
      total_consumed: 0,
      requests: new Set<string>(),
    };

    const product = clean(row.product, "");
    const productCategory = clean(row.category, "");
    if (product) current.products.add(product);
    if (productCategory) current.categories.add(productCategory);
    current.total_consumed += Number(row.quantity ?? 0) || 0;
    current.requests.add(clean(row.mrf_no ?? row.id));
    groups.set(key, current);
  }

  return [...groups.values()].map((group) => ({
    component_category: group.component_category,
    component_model: group.component_model,
    part_code: group.part_code,
    product_models: [...group.products].sort().join(", ") || "—",
    product_categories: [...group.categories].sort().join(", ") || "—",
    total_consumed: group.total_consumed,
    request_count: group.requests.size,
  }));
}
