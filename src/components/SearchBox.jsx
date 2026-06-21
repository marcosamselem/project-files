import React, { useEffect, useRef, useState } from "react";

/**
 * Search-as-you-type box. Keeps a local input value for snappy typing and
 * debounces calls into the Helper so we don't fire a query per keystroke.
 */
export default function SearchBox({ search }) {
  const [value, setValue] = useState(search.query);
  const timer = useRef(null);

  // Keep local input in sync when query is cleared elsewhere (e.g. Clear all).
  useEffect(() => {
    setValue(search.query);
  }, [search.query]);

  const onChange = (e) => {
    const v = e.target.value;
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search.actions.setQuery(v), 150);
  };

  const onClear = () => {
    setValue("");
    clearTimeout(timer.current);
    search.actions.setQuery("");
  };

  return (
    <div className="searchbox">
      <svg className="searchbox__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 21l-4.35-4.35M11 18a7 7 0 110-14 7 7 0 010 14z" />
      </svg>
      <input
        className="searchbox__input"
        type="search"
        value={value}
        onChange={onChange}
        placeholder="Search restaurants by name, cuisine, or neighborhood"
        autoFocus
        aria-label="Search restaurants"
      />
      {value && (
        <button className="searchbox__clear" onClick={onClear} aria-label="Clear search">
          ×
        </button>
      )}
    </div>
  );
}
