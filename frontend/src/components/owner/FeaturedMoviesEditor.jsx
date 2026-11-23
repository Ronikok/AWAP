import { useEffect, useMemo, useState } from "react";
import { fetchOwnerMovies, saveFeaturedMovies } from "../../api";

// Lets the owner pick which movies are in the front page carousel and in
// what order. Nothing changes on the public site until "Tallenna" is pressed.
export default function FeaturedMoviesEditor() {
  const [movies, setMovies] = useState([]);
  const [featuredIds, setFeaturedIds] = useState([]); // ordered, as shown in carousel
  const [savedIds, setSavedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchOwnerMovies()
      .then((data) => {
        const ordered = data
          .filter((m) => m.featured)
          .sort((a, b) => a.featured_position - b.featured_position)
          .map((m) => m.id);
        setMovies(data);
        setFeaturedIds(ordered);
        setSavedIds(ordered);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const moviesById = useMemo(
    () => new Map(movies.map((m) => [m.id, m])),
    [movies],
  );

  const dirty = featuredIds.join(",") !== savedIds.join(",");

  const available = movies.filter(
    (m) =>
      !featuredIds.includes(m.id) &&
      m.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function change(next) {
    setFeaturedIds(next);
    setMessage("");
  }

  function add(id) {
    change([...featuredIds, id]);
  }

  function remove(id) {
    change(featuredIds.filter((x) => x !== id));
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= featuredIds.length) return;
    const next = [...featuredIds];
    [next[index], next[target]] = [next[target], next[index]];
    change(next);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveFeaturedMovies(featuredIds);
      setSavedIds(featuredIds);
      setMessage("Etusivu päivitetty.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Ladataan elokuvia...</p>;

  return (
    <section>
      <p className="owner-hint">
        Valitse elokuvat, jotka näkyvät etusivun karusellissa. Järjestys on
        sama kuin etusivulla.
      </p>

      <div className="owner-columns">
        <div className="owner-panel">
          <h2>Etusivulla ({featuredIds.length})</h2>

          {featuredIds.length === 0 && (
            <p className="owner-empty">
              Yhtään elokuvaa ei ole valittu. Etusivun karuselli on tyhjä.
            </p>
          )}

          <ol className="owner-list">
            {featuredIds.map((id, index) => {
              const movie = moviesById.get(id);
              if (!movie) return null;
              return (
                <li key={id} className="owner-row">
                  <MovieThumb movie={movie} />
                  <span className="owner-row-title">{movie.title}</span>
                  <div className="owner-row-actions">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Siirrä ${movie.title} ylös`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === featuredIds.length - 1}
                      aria-label={`Siirrä ${movie.title} alas`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="owner-danger"
                      onClick={() => remove(id)}
                      aria-label={`Poista ${movie.title} etusivulta`}
                    >
                      Poista
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="owner-panel">
          <h2>Muut elokuvat</h2>
          <input
            type="search"
            className="owner-search"
            placeholder="Hae elokuvaa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Hae elokuvaa"
          />

          {available.length === 0 && (
            <p className="owner-empty">Ei lisättäviä elokuvia.</p>
          )}

          <ul className="owner-list">
            {available.map((movie) => (
              <li key={movie.id} className="owner-row">
                <MovieThumb movie={movie} />
                <span className="owner-row-title">{movie.title}</span>
                <div className="owner-row-actions">
                  <button type="button" onClick={() => add(movie.id)}>
                    Lisää
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="owner-savebar">
        <button
          type="button"
          className="owner-primary"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? "Tallennetaan..." : "Tallenna etusivu"}
        </button>
        {dirty && !saving && (
          <span className="owner-unsaved">Tallentamattomia muutoksia</span>
        )}
        {message && <span className="owner-success">{message}</span>}
        {error && <span className="owner-error">{error}</span>}
      </div>
    </section>
  );
}

function MovieThumb({ movie }) {
  return movie.image_url ? (
    <img className="owner-thumb" src={movie.image_url} alt="" />
  ) : (
    <div className="owner-thumb owner-thumb-empty" aria-hidden="true" />
  );
}
