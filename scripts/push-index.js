/**
 * Push records to Algolia and apply tuned index settings.
 *
 *   node --env-file=.env scripts/push-index.js
 *
 * Requires ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, ALGOLIA_INDEX_NAME in .env.
 * Reads ./data/records.json (produced by scripts/prepare-data.js).
 */

const fs = require("fs");
const path = require("path");
const algoliasearch = require("algoliasearch");

const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, ALGOLIA_INDEX_NAME } =
  process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY || !ALGOLIA_INDEX_NAME) {
  console.error(
    "Missing env vars. Run with:  node --env-file=.env scripts/push-index.js"
  );
  process.exit(1);
}

const INDEX = ALGOLIA_INDEX_NAME;
const REPLICAS = {
  rating: `${INDEX}_rating_desc`,
  reviews: `${INDEX}_reviews_desc`,
  priceAsc: `${INDEX}_price_asc`,
  priceDesc: `${INDEX}_price_desc`,
};

// ---------------------------------------------------------------------------
// Shared settings — applied to the primary AND every replica.
//
// Replicas do NOT automatically inherit these from the primary, so the
// searchable + faceting config must be set on each one explicitly. Without
// `attributesForFaceting` on a replica, filtering by cuisine/price/etc. on a
// sorted view matches zero records. Only `ranking`/`customRanking` differ
// between the primary and its replicas.
// ---------------------------------------------------------------------------
const SHARED_SETTINGS = {
  // Order = priority. `name` is the strongest signal so known-item searches
  // ("Boulevard") match the restaurant before a cuisine or address does.
  // Cuisine fields share one tier; location fields share the next.
  searchableAttributes: [
    "name",
    "unordered(food_type_raw),unordered(cuisine),unordered(food_types)",
    "unordered(neighborhood),unordered(city),unordered(area)",
    "unordered(address)",
  ],

  // What users can filter/refine by. `searchable(...)` lets the UI offer a
  // search box inside long facet lists (cuisine, neighborhood, city).
  attributesForFaceting: [
    "searchable(cuisine)",
    "searchable(food_types)",
    "searchable(neighborhood)",
    "searchable(city)",
    "payment_options",
    "dining_style",
    "price", // numeric: enables price facet + range filtering
    "price_range",
    "rating", // numeric: enables "X stars & up" filtering
    "state",
  ],

  // Geo: _geoloc is present on every record, enabling aroundLatLng ranking.
  // Forgiving known-item search: keep typo tolerance on (defaults are good for
  // restaurant names), and progressively relax words when a query is too
  // specific so we degrade to fewer-but-relevant results instead of zero.
  removeWordsIfNoResults: "allOptional",
  ignorePlurals: true,

  attributesToHighlight: ["name", "cuisine", "neighborhood", "city"],
  attributesToRetrieve: [
    "name",
    "cuisine",
    "food_type_raw",
    "dining_style",
    "neighborhood",
    "city",
    "area",
    "state",
    "address",
    "rating",
    "reviews_count",
    "price",
    "price_tier",
    "price_range",
    "payment_options",
    "image_url",
    "reserve_url",
    "_geoloc",
  ],
};

// ---------------------------------------------------------------------------
// Primary index settings = shared config + the default ranking + replica list.
// ---------------------------------------------------------------------------
const PRIMARY_SETTINGS = {
  ...SHARED_SETTINGS,

  // Tie-breaker after textual relevance: our blended quality+popularity score,
  // then raw review volume. Drives a strong default/empty-query ordering.
  customRanking: ["desc(popularity)", "desc(reviews_count)"],

  // Sort options for the discovery experience (see replica configs below).
  replicas: Object.values(REPLICAS),
};

// Replicas share the primary's relevance but change the ranking order so the
// UI can offer "Top rated", "Most reviewed", "Price: low/high".
const REPLICA_RANKING = {
  [REPLICAS.rating]: ["desc(rating)", "desc(reviews_count)"],
  [REPLICAS.reviews]: ["desc(reviews_count)", "desc(rating)"],
  [REPLICAS.priceAsc]: ["asc(price)", "desc(popularity)"],
  [REPLICAS.priceDesc]: ["desc(price)", "desc(popularity)"],
};

async function main() {
  const records = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "data", "records.json"), "utf8")
  );

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);
  const index = client.initIndex(INDEX);

  console.log(`Applying settings to "${INDEX}" (with replicas)...`);
  await index.setSettings(PRIMARY_SETTINGS).wait();

  console.log(`Pushing ${records.length} records...`);
  await index.saveObjects(records).wait();

  console.log("Configuring replicas (shared settings + sort ranking)...");
  for (const [replicaName, ranking] of Object.entries(REPLICA_RANKING)) {
    await client
      .initIndex(replicaName)
      .setSettings({
        ...SHARED_SETTINGS,
        customRanking: [],
        ranking: rankingWithCustom(ranking),
      })
      .wait();
    console.log(`  ${replicaName}: ${ranking.join(", ")}`);
  }

  console.log("\nDone. Index + replicas configured and populated.");
}

// Build a full ranking array, injecting our sort criteria after the textual
// criteria but before the default custom tie-breaker.
function rankingWithCustom(custom) {
  return [
    "typo",
    "geo",
    "words",
    "filters",
    "proximity",
    "attribute",
    "exact",
    ...custom,
  ];
}

main().catch((err) => {
  console.error("Indexing failed:", err.message || err);
  process.exit(1);
});
