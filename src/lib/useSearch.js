import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createHelper,
  INDEX_NAME,
  DISJUNCTIVE_FACETS,
  FALLBACK_GEO,
} from "./algolia";

/**
 * useSearch — wraps the Algolia JS Helper and exposes search state + actions
 * to React. The Helper is the single source of truth for query state
 * (query, refinements, sort index, page, geo); after every `result` event we
 * read `helper.state` back into React so the UI always mirrors the Helper.
 *
 * Deliberately built on the JS Helper (not InstantSearch) to make the search
 * state, queries and refinement logic explicit.
 */
const FACETS_TO_READ = ["cuisine", "price", "payment_options", "dining_style", "neighborhood"];

const initialState = {
  hits: [],
  nbHits: 0,
  page: 0,
  nbPages: 0,
  processingTimeMS: 0,
  query: "",
  facets: {},
  refinements: {
    cuisine: [],
    price: [],
    payment_options: [],
    dining_style: [],
    neighborhood: [],
    ratingMin: 0,
  },
  sortIndex: INDEX_NAME,
  geo: null, // { label, lat, lng } when active
  loading: true,
  error: null,
};

export function useSearch() {
  const helperRef = useRef(null);
  if (!helperRef.current) helperRef.current = createHelper();
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const helper = helperRef.current;

    const onResult = ({ results }) => {
      const hs = helper.state;
      const num = (hs.numericRefinements.rating || {})[">="];
      setState((s) => ({
        ...s,
        hits: results.hits,
        nbHits: results.nbHits,
        page: results.page,
        nbPages: results.nbPages,
        processingTimeMS: results.processingTimeMS,
        query: hs.query || "",
        sortIndex: hs.index,
        geo: hs.aroundLatLng ? s.geo : null,
        facets: Object.fromEntries(
          FACETS_TO_READ.map((f) => [
            f,
            safeFacetValues(results, f),
          ])
        ),
        refinements: {
          ...Object.fromEntries(
            DISJUNCTIVE_FACETS.map((f) => [
              f,
              hs.disjunctiveFacetsRefinements[f] || [],
            ])
          ),
          ratingMin: num && num.length ? num[0] : 0,
        },
        loading: false,
        error: null,
      }));
    };

    const onError = ({ error }) => {
      // eslint-disable-next-line no-console
      console.error("Algolia error:", error);
      setState((s) => ({ ...s, loading: false, error: error.message }));
    };

    helper.on("result", onResult);
    helper.on("error", onError);
    helper.search();

    return () => {
      helper.removeListener("result", onResult);
      helper.removeListener("error", onError);
    };
  }, []);

  const helper = helperRef.current;
  const startLoading = () => setState((s) => ({ ...s, loading: true }));

  const setQuery = useCallback(
    (q) => {
      startLoading();
      helper.setQuery(q).setPage(0).search();
    },
    [helper]
  );

  const toggleRefinement = useCallback(
    (facet, value) => {
      startLoading();
      helper.toggleFacetRefinement(facet, value).setPage(0).search();
    },
    [helper]
  );

  const setRatingMin = useCallback(
    (min) => {
      startLoading();
      helper.removeNumericRefinement("rating");
      if (min > 0) helper.addNumericRefinement("rating", ">=", min);
      helper.setPage(0).search();
    },
    [helper]
  );

  const setSort = useCallback(
    (indexName) => {
      startLoading();
      helper.setIndex(indexName).setPage(0).search();
    },
    [helper]
  );

  const setPage = useCallback(
    (p) => {
      startLoading();
      helper.setPage(p).search();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [helper]
  );

  // "Near me": rank results by distance. aroundRadius:'all' re-ranks every
  // record by proximity without hard-filtering, so results stay full.
  const enableGeoAt = useCallback(
    (loc) => {
      startLoading();
      helper
        .setQueryParameter("aroundLatLng", `${loc.lat},${loc.lng}`)
        .setQueryParameter("aroundRadius", "all")
        .setQueryParameter("getRankingInfo", true)
        .setPage(0)
        .search();
      setState((s) => ({ ...s, geo: loc }));
    },
    [helper]
  );

  const enableGeo = useCallback(() => {
    if (!navigator.geolocation) return enableGeoAt(FALLBACK_GEO);
    // Some environments (and headless browsers) never invoke either callback,
    // which would leave the feature hung. Race the request against a safety
    // timer so we always resolve to a usable location.
    let settled = false;
    const settle = (loc) => {
      if (settled) return;
      settled = true;
      enableGeoAt(loc);
    };
    const safety = setTimeout(() => settle(FALLBACK_GEO), 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(safety);
        settle({
          label: "your location",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        clearTimeout(safety);
        settle(FALLBACK_GEO); // denied/unavailable -> fallback metro
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, [enableGeoAt]);

  const disableGeo = useCallback(() => {
    startLoading();
    helper
      .setQueryParameter("aroundLatLng", undefined)
      .setQueryParameter("aroundRadius", undefined)
      .setQueryParameter("getRankingInfo", false)
      .search();
    setState((s) => ({ ...s, geo: null }));
  }, [helper]);

  const clearAll = useCallback(() => {
    startLoading();
    helper.clearRefinements();
    helper.removeNumericRefinement("rating");
    helper.setQuery("").setPage(0).search();
  }, [helper]);

  const isRefined = useCallback(
    (facet, value) => helper.state.isDisjunctiveFacetRefined(facet, value),
    [helper]
  );

  const hasActiveRefinements = useMemo(() => {
    const r = state.refinements;
    return (
      r.ratingMin > 0 ||
      DISJUNCTIVE_FACETS.some((f) => (r[f] || []).length > 0)
    );
  }, [state.refinements]);

  return {
    ...state,
    actions: {
      setQuery,
      toggleRefinement,
      setRatingMin,
      setSort,
      setPage,
      enableGeo,
      enableGeoAt,
      disableGeo,
      clearAll,
    },
    isRefined,
    hasActiveRefinements,
  };
}

function safeFacetValues(results, facet) {
  try {
    return results.getFacetValues(facet, { sortBy: ["count:desc", "name:asc"] });
  } catch {
    return [];
  }
}
