/**
 * Data preparation for the OpenTable / Algolia demo.
 *
 * Joins the two provided source files on `objectID`, cleans and normalizes
 * the fields, enriches a few attributes for discovery, and writes a single
 * import-ready records file to ./data/records.json.
 *
 *   node scripts/prepare-data.js
 *
 * Source files (./dataset):
 *   - restaurants_list.json : 5,000 records (name, address, geo, price, payment, urls)
 *   - restaurants_info.csv   : 5,000 rows, ';'-delimited (cuisine, rating, reviews, etc.)
 *
 * Join key `objectID` is a verified 1:1 match across both files.
 */

const fs = require("fs");
const path = require("path");

const DATASET_DIR = path.join(__dirname, "..", "dataset");
const OUT_DIR = path.join(__dirname, "..", "data");
const OUT_FILE = path.join(OUT_DIR, "records.json");

// ---------------------------------------------------------------------------
// Payment options: the demo must only expose these four normalized cards.
// Diners Club and Carte Blanche are treated as Discover. Everything else
// (Cash Only, JCB, Pay with OpenTable) is dropped from the exposed facet.
// ---------------------------------------------------------------------------
const PAYMENT_MAP = {
  AMEX: "Amex",
  "American Express": "Amex",
  Visa: "Visa",
  MasterCard: "MasterCard",
  Discover: "Discover",
  "Diners Club": "Discover",
  "Carte Blanche": "Discover",
};

function normalizePaymentOptions(options = []) {
  const out = new Set();
  for (const opt of options) {
    const mapped = PAYMENT_MAP[opt];
    if (mapped) out.add(mapped);
  }
  return [...out].sort();
}

// ---------------------------------------------------------------------------
// Price: trust the clean numeric price (2/3/4) as canonical and derive a
// consistent label + symbol so display, faceting and ranking always agree.
// ---------------------------------------------------------------------------
const PRICE_LABELS = {
  2: { tier: "$", range: "$30 and under" },
  3: { tier: "$$", range: "$31 to $50" },
  4: { tier: "$$$", range: "$50 and over" },
};

// ---------------------------------------------------------------------------
// Cuisine normalization.
//
// food_type has 114 raw values, many compound ("Global, International",
// "Contemporary American", "Tapas / Small Plates"). For a clean primary facet
// we derive a single `cuisine` via ordered keyword rules (specific first).
// We also keep:
//   - food_type_raw : the original string, searchable
//   - food_types    : the compound value split into tokens, for search + tags
// If no rule matches we keep the original value rather than bucketing to
// "Other", so information is never lost.
// ---------------------------------------------------------------------------
const CUISINE_RULES = [
  [/brazilian steak|steakhouse|steak/i, "Steakhouse"],
  [/sushi|japanese|izakaya/i, "Japanese"],
  [/pizz|italian/i, "Italian"],
  [/contemporary french|french/i, "French"],
  [/seafood/i, "Seafood"],
  [/mexican|southwest/i, "Mexican / Southwestern"],
  [/creole|cajun|southern|comfort food|barbecue|soul/i, "Southern & BBQ"],
  [/californian|northwest|hawaii/i, "Regional American"],
  [/contemporary american|american/i, "American"],
  [/mediterranean|greek|spanish|tapas/i, "Mediterranean"],
  [/latin american|brazilian|peruvian|argentin|cuban/i, "Latin American"],
  [/chinese|thai|vietnamese|korean|asian|fusion \/ eclectic/i, "Asian"],
  [/indian/i, "Indian"],
  [/fondue|gastro pub|continental|european|global|international/i, "International"],
];

function deriveCuisine(foodType) {
  for (const [re, label] of CUISINE_RULES) {
    if (re.test(foodType)) return label;
  }
  return foodType.trim();
}

function splitFoodTypes(foodType) {
  return [
    ...new Set(
      foodType
        .split(/[,/]/)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

// ---------------------------------------------------------------------------
// CSV parsing. Verified: 5,000 rows, exactly 8 ';'-delimited columns, no
// quoting/embedded delimiters, so a plain split is safe.
// ---------------------------------------------------------------------------
function parseInfoCsv(text) {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  const header = lines[0].split(";");
  const byId = new Map();
  for (const line of lines.slice(1)) {
    const cols = line.split(";");
    const row = {};
    header.forEach((h, i) => (row[h] = cols[i]));
    byId.set(String(row.objectID), row);
  }
  return byId;
}

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}
function toFloat(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function main() {
  const list = JSON.parse(
    fs.readFileSync(path.join(DATASET_DIR, "restaurants_list.json"), "utf8")
  );
  const info = parseInfoCsv(
    fs.readFileSync(path.join(DATASET_DIR, "restaurants_info.csv"), "utf8")
  );

  const records = [];
  const stats = {
    total: 0,
    missingInfo: 0,
    droppedPaymentValues: new Set(),
    cuisines: {},
  };

  for (const r of list) {
    const id = String(r.objectID);
    const meta = info.get(id);
    if (!meta) {
      stats.missingInfo++;
      continue;
    }

    const priceInfo = PRICE_LABELS[r.price] || { tier: "$", range: "Unknown" };
    const cuisine = deriveCuisine(meta.food_type);
    stats.cuisines[cuisine] = (stats.cuisines[cuisine] || 0) + 1;

    for (const opt of r.payment_options || []) {
      if (!PAYMENT_MAP[opt]) stats.droppedPaymentValues.add(opt);
    }

    records.push({
      objectID: r.objectID,
      name: r.name,

      // cuisine / category
      cuisine,
      food_types: splitFoodTypes(meta.food_type),
      food_type_raw: meta.food_type,
      dining_style: meta.dining_style,

      // location
      neighborhood: meta.neighborhood,
      city: r.city,
      area: r.area,
      state: r.state,
      postal_code: r.postal_code,
      country: r.country,
      address: r.address,
      _geoloc: r._geoloc,

      // quality / popularity signals
      rating: toFloat(meta.stars_count),
      reviews_count: toInt(meta.reviews_count),

      // price
      price: r.price,
      price_tier: priceInfo.tier,
      price_range: priceInfo.range,

      // payment
      payment_options: normalizePaymentOptions(r.payment_options),

      // media & booking
      image_url: r.image_url,
      reserve_url: r.reserve_url,
      mobile_reserve_url: r.mobile_reserve_url,
      phone: meta.phone_number || r.phone,
    });
    stats.total++;
  }

  // -------------------------------------------------------------------------
  // Enrichment: Bayesian "popularity" score (IMDB-style weighted rating).
  //
  //   popularity = (v / (v + m)) * R + (m / (v + m)) * C
  //
  // R = the restaurant's rating, v = its review count, C = the global mean
  // rating, m = a smoothing constant (reviews needed to "trust" a rating).
  // This pulls restaurants with very few reviews toward the global average so
  // a 5.0 with 3 reviews can't outrank a 4.6 with 3,000. Used as the single
  // custom-ranking attribute, it rewards both quality AND proven popularity.
  // -------------------------------------------------------------------------
  const C =
    records.reduce((sum, r) => sum + r.rating, 0) / (records.length || 1);
  const m = 50; // smoothing: ~median review volume; tunable
  for (const r of records) {
    const v = r.reviews_count;
    r.popularity =
      Math.round(((v / (v + m)) * r.rating + (m / (v + m)) * C) * 1000) / 1000;
  }
  console.log(
    `Popularity score: global mean rating C=${C.toFixed(3)}, smoothing m=${m}`
  );

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(records, null, 2));

  // ---- report ----
  console.log(`Joined records:        ${stats.total}`);
  console.log(`List rows w/o info:    ${stats.missingInfo}`);
  console.log(`Dropped payment values: ${[...stats.droppedPaymentValues].sort().join(", ")}`);
  console.log(`Distinct cuisines:     ${Object.keys(stats.cuisines).length}`);
  console.log(
    `Top cuisines:          ` +
      Object.entries(stats.cuisines)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([k, v]) => `${k} (${v})`)
        .join(", ")
  );
  console.log(`\nWrote ${records.length} records -> ${path.relative(process.cwd(), OUT_FILE)}`);
}

main();
