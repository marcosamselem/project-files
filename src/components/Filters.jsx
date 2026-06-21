import React, { useState } from "react";

const PRICE_LABELS = {
  2: { tier: "$", note: "$30 & under" },
  3: { tier: "$$", note: "$31–$50" },
  4: { tier: "$$$", note: "$50 & over" },
};

const RATING_STEPS = [
  { min: 4.5, label: "4.5" },
  { min: 4, label: "4.0" },
  { min: 3.5, label: "3.5" },
  { min: 3, label: "3.0" },
];

export default function Filters({ search }) {
  const { facets, refinements, actions, hasActiveRefinements } = search;

  return (
    <div className="filters">
      <div className="filters__head">
        <h2>Refine</h2>
        {hasActiveRefinements && (
          <button className="link-btn" onClick={actions.clearAll}>
            Clear all
          </button>
        )}
      </div>

      <RefinementList
        title="Cuisine"
        values={facets.cuisine}
        searchable
        onToggle={(v) => actions.toggleRefinement("cuisine", v)}
      />

      <Section title="Price">
        <div className="price-row">
          {[2, 3, 4].map((p) => {
            const fv = (facets.price || []).find((f) => f.name === String(p));
            const active = refinements.price.includes(String(p));
            return (
              <button
                key={p}
                className={`pill ${active ? "pill--on" : ""}`}
                onClick={() => actions.toggleRefinement("price", String(p))}
                disabled={!fv && !active}
                title={PRICE_LABELS[p].note}
              >
                {PRICE_LABELS[p].tier}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Rating">
        <div className="rating-row">
          {RATING_STEPS.map(({ min, label }) => {
            const active = refinements.ratingMin === min;
            return (
              <button
                key={min}
                className={`pill ${active ? "pill--on" : ""}`}
                onClick={() => actions.setRatingMin(active ? 0 : min)}
              >
                ★ {label}+
              </button>
            );
          })}
        </div>
      </Section>

      <RefinementList
        title="Payment options"
        values={facets.payment_options}
        onToggle={(v) => actions.toggleRefinement("payment_options", v)}
      />

      <RefinementList
        title="Dining style"
        values={facets.dining_style}
        onToggle={(v) => actions.toggleRefinement("dining_style", v)}
      />

      <RefinementList
        title="Neighborhood"
        values={facets.neighborhood}
        searchable
        onToggle={(v) => actions.toggleRefinement("neighborhood", v)}
      />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="facet">
      <h3 className="facet__title">{title}</h3>
      {children}
    </div>
  );
}

function RefinementList({ title, values = [], onToggle, searchable = false }) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(false);

  let list = values;
  if (searchable && q) {
    const needle = q.toLowerCase();
    list = list.filter((v) => v.name.toLowerCase().includes(needle));
  }
  const limit = expanded ? 100 : 6;
  const shown = list.slice(0, limit);

  return (
    <Section title={title}>
      {searchable && (
        <input
          className="facet__search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}`}
        />
      )}
      <ul className="facet__list">
        {shown.map((v) => (
          <li key={v.name}>
            <label className={`facet__item ${v.isRefined ? "facet__item--on" : ""}`}>
              <input
                type="checkbox"
                checked={v.isRefined}
                onChange={() => onToggle(v.name)}
              />
              <span className="facet__label">{v.name}</span>
              <span className="facet__count">{v.count.toLocaleString()}</span>
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="facet__empty">No matches</li>}
      </ul>
      {list.length > 6 && (
        <button className="link-btn" onClick={() => setExpanded((x) => !x)}>
          {expanded ? "Show less" : `Show ${list.length - 6} more`}
        </button>
      )}
    </Section>
  );
}
