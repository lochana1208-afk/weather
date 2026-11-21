"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { cities, type City } from "../lib/weather";
import { searchCities } from "../lib/api";

export function LocationPicker({ city, select, locate, locating }: {
  city: City; select: (city: City) => void; locate: () => void; locating: boolean;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(false);
  const [search, setSearch] = useState<{ query: string; list: City[]; error?: string }>();
  const name = query.trim();
  useEffect(() => {
    if (!active || name.length < 2) return;
    let ignore = false;
    const timer = window.setTimeout(async () => {
      try {
        const list = await searchCities(name);
        if (!ignore) setSearch({ query: name, list });
      } catch (error) {
        if (!ignore) setSearch({ query: name, list: [], error: error instanceof Error && error.message.includes("rate limiting")
          ? error.message : "City search is unavailable. Try again or pick a suggested city." });
      }
    }, 350);
    return () => { ignore = true; window.clearTimeout(timer); };
  }, [name, active]);

  const suggested = cities.filter(place => !name || place.name.toLowerCase().includes(name.toLowerCase()));
  const result = search?.query === name ? search : undefined;
  const list = [...suggested, ...(name.length < 2 ? [] : result?.list ?? [])].filter((place, index, all) =>
    all.findIndex(other => other.name === place.name && other.state === place.state &&
      Math.abs(other.latitude - place.latitude) < 0.15 && Math.abs(other.longitude - place.longitude) < 0.15) === index);
  const choose = (place: City) => { select(place); setQuery(""); setActive(false); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (list.length) choose(list[0]);
  };
  return (
    <div className="location-picker" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setActive(false);
    }} onKeyDown={event => {
      if (event.key === "Escape") { setActive(false); setQuery(""); }
    }}>
      <form className="city-input" role="search" onSubmit={submit}>
        <Search size={17} aria-hidden="true" />
        <input aria-label="Search Indian cities" placeholder={city.name} value={query}
          onFocus={() => setActive(true)} onClick={() => setActive(true)} onChange={event => {
            setQuery(event.target.value); setSearch(undefined); setActive(true);
          }} />
      </form>
      <button className="icon-button" type="button" onClick={() => { setActive(false); setQuery(""); locate(); }}
        aria-label="Use my location" title="Use my location" disabled={locating}>
        <LocateFixed size={19} aria-hidden="true" />
      </button>
      {active && <div className="city-results">
        {name.length < 2 && <p>Suggested cities</p>}
        {name.length >= 2 && !result && <p role="status">Searching cities…</p>}
        {result?.error && <p role="status">{result.error}</p>}
        {result && !result.error && !list.length && <p role="status">No Indian cities found for this search.</p>}
        {list.map(place => <button key={place.latitude + "," + place.longitude} type="button" onClick={() => choose(place)}>
          <MapPin size={16} aria-hidden="true" />
          <span>{place.name}<small>{place.state}</small></span>
        </button>)}
      </div>}
    </div>
  );
}
