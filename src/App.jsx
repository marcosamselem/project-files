import React from "react";
import { useSearch } from "./lib/useSearch";
import SearchBox from "./components/SearchBox.jsx";
import Filters from "./components/Filters.jsx";
import Results from "./components/Results.jsx";
import Inspiration from "./components/Inspiration.jsx";

export default function App() {
  const search = useSearch();
  const { query, geo, hasActiveRefinements, nbHits, loading } = search;

  // Show the discovery/inspiration landing until the user starts a known-item
  // search, refines, or switches on "Near me".
  const exploring = query.trim() !== "" || hasActiveRefinements || !!geo;

  // Live result count surfaced under the search box for every search, so the
  // number of matches is always visible (not only inside the results view).
  const trimmedQuery = query.trim();
  const isActiveSearch = trimmedQuery !== "" || hasActiveRefinements || !!geo;
  const countLabel = loading
    ? "Searching…"
    : isActiveSearch
      ? `${nbHits.toLocaleString()} ${nbHits === 1 ? "result" : "results"}${
          trimmedQuery ? ` for “${trimmedQuery}”` : ""
        }`
      : `Search across ${nbHits.toLocaleString()} restaurants`;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand__mark">Open</span>Table
          </div>
          <p className="brand__tag">Discover places to eat</p>
        </div>
      </header>

      <section className="hero">
        <div className="hero__inner">
          <h1 className="hero__title">
            Find your table — from a name you know or a craving you can't place.
          </h1>
          <SearchBox search={search} />
          <p className="hero__count" aria-live="polite">
            {countLabel}
          </p>
        </div>
      </section>

      <main className="layout">
        {exploring ? (
          <div className="layout__grid">
            <aside className="layout__sidebar">
              <Filters search={search} />
            </aside>
            <div className="layout__main">
              <Results search={search} />
            </div>
          </div>
        ) : (
          <Inspiration search={search} />
        )}
      </main>

      <footer className="footer">
        Demo built on the Algolia JS Helper · {search.nbHits.toLocaleString()}{" "}
        restaurants indexed
      </footer>
    </div>
  );
}
