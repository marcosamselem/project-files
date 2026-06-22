# OpenTable Restaurant Discovery — Algolia SE Demo

An interactive restaurant search & discovery prototype for the OpenTable
opportunity, built on the **Algolia JavaScript Helper** (not InstantSearch) with
a **React + Vite** front end.

The demo is designed around OpenTable's two user personas from the discovery
notes:

- **Known-item search** — users who know the restaurant and want it fast,
  forgiving of typos, and disambiguated when a name has multiple locations.
- **Open-ended discovery** — users who are exploring and want to browse, filter,
  sort, and get inspired.

## Links

- **Live demo:** https://project-files-lemon.vercel.app
- **Repository:** https://github.com/marcosamselem/project-files

> The live demo runs against a hosted Algolia index using a search-only
> (read) API key, so it works with no setup. The Algolia account uses
> `Interview Candidate` in the company field.

---

## Quick start

There are two ways to run this, depending on whether you just want to see the
demo or rebuild the search index from source.

### Option A — Just want to see it? (no data scripts needed)

The prepared data (`data/records.json`) is committed and already lives in a live
Algolia index, so you only need the **search-only** credentials to connect.

```bash
# 1. Install
npm install

# 2. Add the provided .env (search-only key) to the project root.
#    The search key is read-only and safe to share.

# 3. Run the app
npm run dev                 # http://localhost:1234
```

### Option B — Want to rebuild the index from source?

Use this to verify the data pipeline or build your own index on your own Algolia
account. Requires your own **Admin API key** in `.env`.

```bash
# 1. Install
npm install

# 2. Configure credentials
cp .env.example .env        # then fill in your Algolia keys

# 3. Build the index (one-time data pipeline)
npm run prepare-data        # joins + cleans the two source files -> data/records.json
npm run push-index          # pushes records + applies tuned settings & replicas

# 4. Run the app
npm run dev                 # http://localhost:1234
```

`.env` (gitignored) needs:

```
ALGOLIA_APP_ID=...
ALGOLIA_ADMIN_API_KEY=...        # server-side only, used by push-index
ALGOLIA_SEARCH_API_KEY=...       # search-only, safe in the browser
ALGOLIA_INDEX_NAME=restaurants
VITE_ALGOLIA_APP_ID=...          # exposed to the front end
VITE_ALGOLIA_SEARCH_API_KEY=...
VITE_ALGOLIA_INDEX_NAME=restaurants
```

---

## Project structure

```
scripts/
  prepare-data.js     # joins + cleans the two source files -> data/records.json
  push-index.js       # pushes records and applies index settings + sort replicas
data/
  records.json        # generated, import-ready records
src/
  lib/algolia.js      # client, index/replica names, facet config
  lib/useSearch.js    # the Algolia JS Helper integration (search state -> React)
  components/          # SearchBox, Filters, Results, Inspiration
customer-answers.md   # answers to the communication questions
```

---

## Data pipeline (`scripts/prepare-data.js`)

**The join.** The two source files share a clean 1:1 key, `objectID`
(5,000 ↔ 5,000, no orphans or duplicates), so they merge directly:

- `restaurants_list.json` → name, address, geo, price, payment options, URLs
- `restaurants_info.csv` (`;`-delimited) → cuisine (`food_type`), rating,
  review count, neighborhood, price range, dining style

**Cleaning & normalization**

- **Payment options** are normalized to only the four required cards —
  `Amex`, `Visa`, `MasterCard`, `Discover`. Per the brief, **Diners Club** and
  **Carte Blanche** are folded into **Discover**; `Cash Only`, `JCB`, and
  `Pay with OpenTable` are dropped from the exposed facet.
- **Price** is reconciled. The JSON `price` (2/3/4) is clean and is treated as
  canonical; we derive a consistent `price_tier` (`$`/`$$`/`$$$`) and label so
  display, faceting, and ranking always agree (the CSV `price_range` string
  agreed with it ~96% of the time).
- **Cuisine** is the messiest field: 114 raw `food_type` values, many compound
  ("Global, International", "Contemporary American", "Tapas / Small Plates").
  We derive a clean primary `cuisine` via ordered keyword rules for a usable
  facet, while keeping `food_type_raw` (searchable) and a split `food_types`
  array so no information is lost.

**Enrichment — a blended popularity score**

A single noisy signal misranks restaurants (a 5.0★ with 3 reviews shouldn't beat
a 4.6★ with 3,000). We compute an IMDB-style Bayesian `popularity`:

```
popularity = (v / (v + m)) * R + (m / (v + m)) * C
```

where `R` = rating, `v` = review count, `C` = global mean rating (≈4.29),
`m` = smoothing constant (50). This pulls low-volume outliers toward the mean and
gives Custom Ranking one robust attribute that rewards **both quality and proven
demand**.

**Assumptions**

- `objectID` is a reliable join key (validated).
- Numeric `price` is more trustworthy than the CSV price band where they differ.
- The dataset is US-only and every record has valid `_geoloc`, so geo ranking is
  always available.

---

## Index configuration & relevance (`scripts/push-index.js`)

| Setting | Value | Why |
| --- | --- | --- |
| `searchableAttributes` | `name` (1st), then cuisine fields, then location, then address | `name` is the strongest signal so known-item searches resolve to the right restaurant first. |
| `attributesForFaceting` | cuisine, food_types, neighborhood, city (searchable), payment_options, dining_style, price, rating, state | Powers refinement; `searchable()` enables search-within-facet for long lists. |
| `customRanking` | `desc(popularity)`, `desc(reviews_count)` | Tie-breaks equally-relevant matches by blended quality+popularity; also drives a strong empty-query order. |
| Geo | `_geoloc` on every record | Enables "Near me" `aroundLatLng` distance ranking. |
| `removeWordsIfNoResults` | `allOptional` | Degrades gracefully on over-specific queries instead of dead-ending. |
| `ignorePlurals` | `true` | Forgiving matching. |
| Typo tolerance | defaults | Restaurant names are typo-prone; defaults (1 typo ≥4 chars, 2 ≥8) work well. |

**Sort replicas** (for the discovery experience): `Top rated`, `Most reviewed`,
`Price: low→high`, `Price: high→low`, alongside the primary "Best match".

### Relevance testing (evidence)

Representative queries run against the live index:

| Query | Result | Behaviour shown |
| --- | --- | --- |
| `boulevard` | 50 hits; Boulevard, Boulevard Bistro, Boulevard Five72 — each with a distinct neighborhood | **Chain disambiguation** for known-item search |
| `boulvard` (typo) | 51 hits, Boulevard found | **Typo tolerance** |
| `italan` (typo) | 894 Italian hits | Typo tolerance on cuisine |
| `steak` | 537 steakhouses, popularity-ordered | Broad query + custom ranking |
| `sushi downtown` | 2 hits, both matching name + location | Multi-word AND matching |
| `french laundry` | 1 hit, The French Laundry | Precise known-item |
| empty query | popularity-ordered (Russell's Steaks 4.9★/2,512 first) | Sensible **browse default** |
| `xyzzy nonsense` | 0 hits → friendly empty state | Graceful no-match |

---

## UX & discovery design

How the experience maps to OpenTable's stated pains and goals:

- **Inspiration landing** (the "I don't know what I want" persona): instead of the
  current blank results pane, the entry view offers one-click **mood chips**
  (Fine dining, Under $30, Top rated, Steakhouse, Near me), **browse-by-cuisine**
  tiles with live counts, and a live **"Popular right now"** rail. All of these
  drive the same Helper state. → *supports discovery, increases sessions.*
- **Known-item search**: search-as-you-type with typo tolerance, highlighted
  matches, and neighborhood shown on every result so multi-location chains are
  distinguishable. → *fast, forgiving, precise.*
- **Refine & explore**: multi-select facets with live counts (cuisine, price,
  rating, payment, dining style, neighborhood), sort options, and a **"Near me"**
  geo toggle that re-ranks by distance — with an automatic fallback to a default
  metro (San Francisco) when geolocation is denied or unavailable, so the feature
  never hangs.
- **Modern feel + speed**: result count and response time are surfaced
  ("50 results in 5 ms") to make Algolia's performance tangible.

### Architecture note — why the JS Helper

Per the brief, the core search is built on the **Algolia JS Helper**, not
InstantSearch. `src/lib/useSearch.js` makes the Helper the single source of truth
for all query state (query, refinements, sort index, page, geo); after each
`result` event we read `helper.state` back into React. This keeps the mechanics of
search state, queries, and refinements explicit rather than hidden behind widgets.

---

## Known limitations & what I'd improve with more time

- **Restaurant images.** The image URLs in the source dataset
  (`opentable.com/img/restimages/{id}.jpg`) are dead — every one now redirects
  to a single generic OpenTable placeholder, so the cards fall back to a neutral
  tile. This is a limitation of the provided data, not the integration; the next
  step would be a generated placeholder (gradient + cuisine) or a real image CDN.
- **Mobile filters.** The layout is responsive and the filter panel scrolls
  independently on desktop; on small screens the filters stack above results.
  A collapsible filter drawer would be the next refinement.
- **Relevance tuning is a starting point, not a finish line.** With analytics
  enabled (click/conversion events) I'd layer in Algolia's dynamic re-ranking and
  A/B test the `customRanking` weights against real booking data.
- **Synonyms & query rules.** Adding synonyms (e.g. "BBQ" ↔ "barbecue") and
  rules for common intents would further sharpen known-item and discovery search.

---

## Deliverables map

- **Live demo** — https://project-files-lemon.vercel.app
- **Repository** — https://github.com/marcosamselem/project-files
- **Demo app** — `src/`, run with `npm run dev`
- **Data pipeline** — `scripts/prepare-data.js`
- **Index config & import** — `scripts/push-index.js`
- **Communication answers** — `customer-answers.md`
- **This write-up** — `README.md`
