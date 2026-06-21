import React from "react";

/**
 * The landing experience for the "I don't know what I want yet" persona.
 * Instead of an empty results pane, it offers one-click entry points that all
 * drive the same Helper state: mood chips, browse-by-cuisine, and a live
 * "popular right now" rail (the empty-query, popularity-ranked hits).
 */
const MOODS = [
  { label: "Fine dining", apply: (a) => a.toggleRefinement("dining_style", "Fine Dining") },
  { label: "Under $30", apply: (a) => a.toggleRefinement("price", "2") },
  { label: "Top rated (4.5★+)", apply: (a) => a.setRatingMin(4.5) },
  { label: "Steakhouse", apply: (a) => a.toggleRefinement("cuisine", "Steakhouse") },
  { label: "Near me", apply: (a) => a.enableGeo() },
];

export default function Inspiration({ search }) {
  const { facets, hits, actions } = search;
  const cuisines = (facets.cuisine || []).slice(0, 10);
  const popular = hits.slice(0, 6);

  return (
    <div className="inspire">
      <section className="inspire__moods">
        <h2 className="inspire__h">Not sure yet? Start here</h2>
        <div className="chips">
          {MOODS.map((m) => (
            <button key={m.label} className="chip" onClick={() => m.apply(actions)}>
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="inspire__h">Browse by cuisine</h2>
        <div className="cuisine-grid">
          {cuisines.map((c) => (
            <button
              key={c.name}
              className="cuisine-tile"
              onClick={() => actions.toggleRefinement("cuisine", c.name)}
            >
              <span className="cuisine-tile__name">{c.name}</span>
              <span className="cuisine-tile__count">
                {c.count.toLocaleString()} places
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="inspire__h">Popular right now</h2>
        <div className="rail">
          {popular.map((h) => (
            <a
              key={h.objectID}
              className="rail__item"
              href={h.reserve_url}
              target="_blank"
              rel="noreferrer"
            >
              <div className="rail__media">
                <img src={h.image_url} alt={h.name} loading="lazy" />
              </div>
              <div className="rail__body">
                <strong className="rail__name">{h.name}</strong>
                <span className="rail__meta">
                  ★ {h.rating.toFixed(1)} ({h.reviews_count.toLocaleString()}) ·{" "}
                  {h.cuisine}
                </span>
                <span className="rail__sub">
                  {h.neighborhood || h.city} · {h.price_tier}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
