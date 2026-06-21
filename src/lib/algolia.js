import algoliasearch from "algoliasearch";
import algoliasearchHelper from "algoliasearch-helper";

export const APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID;
export const SEARCH_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY;
export const INDEX_NAME = import.meta.env.VITE_ALGOLIA_INDEX_NAME || "restaurants";

export const searchClient = algoliasearch(APP_ID, SEARCH_KEY);

// Sort options map to the primary index + the replicas configured in
// scripts/push-index.js. "Best match" is the primary (relevance + popularity).
export const SORT_OPTIONS = [
  { label: "Best match", value: INDEX_NAME },
  { label: "Top rated", value: `${INDEX_NAME}_rating_desc` },
  { label: "Most reviewed", value: `${INDEX_NAME}_reviews_desc` },
  { label: "Price: low to high", value: `${INDEX_NAME}_price_asc` },
  { label: "Price: high to low", value: `${INDEX_NAME}_price_desc` },
];

// Multi-select facets => disjunctive (OR within a facet, AND across facets).
export const DISJUNCTIVE_FACETS = [
  "cuisine",
  "price",
  "payment_options",
  "dining_style",
  "neighborhood",
];

// Fallback location when the user enables "Near me" but denies/lacks
// geolocation — keeps the geo experience working instead of dead-ending.
export const FALLBACK_GEO = {
  label: "San Francisco",
  lat: 37.7749,
  lng: -122.4194,
};

export function createHelper() {
  return algoliasearchHelper(searchClient, INDEX_NAME, {
    disjunctiveFacets: DISJUNCTIVE_FACETS,
    maxValuesPerFacet: 200,
    hitsPerPage: 24,
  });
}
