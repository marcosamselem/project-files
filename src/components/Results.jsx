import React from "react";
import { SORT_OPTIONS } from "../lib/algolia";

export default function Results({ search }) {
  const {
    hits,
    nbHits,
    processingTimeMS,
    page,
    nbPages,
    sortIndex,
    geo,
    loading,
    error,
    actions,
  } = search;

  if (error) {
    return <div className="notice notice--error">Search error: {error}</div>;
  }

  return (
    <div className={`results ${loading ? "results--loading" : ""}`}>
      <div className="results__bar">
        <div className="results__count">
          <strong>{nbHits.toLocaleString()}</strong> results
          <span className="results__time"> in {processingTimeMS} ms</span>
        </div>

        <div className="results__controls">
          <button
            className={`geo-btn ${geo ? "geo-btn--on" : ""}`}
            onClick={() => (geo ? actions.disableGeo() : actions.enableGeo())}
          >
            <span className="geo-btn__dot" /> {geo ? `Near ${geo.label}` : "Near me"}
          </button>

          <label className="sort">
            Sort
            <select
              value={sortIndex}
              onChange={(e) => actions.setSort(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {nbHits === 0 && !loading ? (
        <EmptyResults query={search.query} onClear={actions.clearAll} />
      ) : (
        <div className="cards">
          {hits.map((h) => (
            <ResultCard key={h.objectID} hit={h} />
          ))}
        </div>
      )}

      {nbPages > 1 && (
        <Pagination page={page} nbPages={nbPages} onPage={actions.setPage} />
      )}
    </div>
  );
}

function ResultCard({ hit }) {
  const distanceKm =
    hit._rankingInfo && typeof hit._rankingInfo.geoDistance === "number"
      ? (hit._rankingInfo.geoDistance / 1000).toFixed(1)
      : null;

  const name = highlight(hit, "name");

  return (
    <article className="card">
      <div className="card__media">
        <img
          src={hit.image_url}
          alt={hit.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
        {distanceKm && <span className="card__distance">{distanceKm} km</span>}
      </div>
      <div className="card__body">
        <h3 className="card__title" dangerouslySetInnerHTML={{ __html: name }} />
        <div className="card__rating">
          <Stars value={hit.rating} />
          <span className="card__score">{hit.rating.toFixed(1)}</span>
          <span className="card__reviews">
            ({hit.reviews_count.toLocaleString()})
          </span>
        </div>
        <p className="card__meta">
          {hit.cuisine} · {hit.neighborhood || hit.city} · {hit.price_tier}
        </p>
        <div className="card__foot">
          <span className="card__pay">{(hit.payment_options || []).join(" · ")}</span>
          <a
            className="card__cta"
            href={hit.reserve_url}
            target="_blank"
            rel="noreferrer"
          >
            Reserve
          </a>
        </div>
      </div>
    </article>
  );
}

function Stars({ value }) {
  const pct = (Math.max(0, Math.min(5, value)) / 5) * 100;
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      <span className="stars__bg">★★★★★</span>
      <span className="stars__fg" style={{ width: `${pct}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

function Pagination({ page, nbPages, onPage }) {
  const max = Math.min(nbPages, 50);
  const start = Math.max(0, Math.min(page - 2, max - 5));
  const pages = [];
  for (let i = start; i < Math.min(start + 5, max); i++) pages.push(i);
  return (
    <nav className="pager">
      <button disabled={page === 0} onClick={() => onPage(page - 1)}>
        ‹ Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={p === page ? "pager__on" : ""}
          onClick={() => onPage(p)}
        >
          {p + 1}
        </button>
      ))}
      <button disabled={page >= max - 1} onClick={() => onPage(page + 1)}>
        Next ›
      </button>
    </nav>
  );
}

function EmptyResults({ query, onClear }) {
  return (
    <div className="notice">
      <p>
        We didn't find any restaurants for <em>"{query}"</em>.
      </p>
      <button className="pill" onClick={onClear}>
        Clear search
      </button>
    </div>
  );
}

// Render Algolia's _highlightResult markup (matched terms wrapped in <mark>).
function highlight(hit, attr) {
  const h = hit._highlightResult && hit._highlightResult[attr];
  return h ? h.value : hit[attr];
}
