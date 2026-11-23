import { useState } from "react";
import FeaturedMoviesEditor from "../components/owner/FeaturedMoviesEditor.jsx";
import ShowtimesEditor from "../components/owner/ShowtimesEditor.jsx";
import "./owner.css";

const TABS = [
  { id: "featured", label: "Etusivun elokuvat" },
  { id: "showtimes", label: "Näytösajat" },
];

// Owner-only page (route is wrapped in <ProtectedRoute roles={["owner"]}> in App.jsx).
export default function OwnerDashboard() {
  const [tab, setTab] = useState("featured");

  return (
    <main className="owner-page">
      <h1>Hallinta</h1>

      <div className="owner-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "owner-tab active" : "owner-tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "featured" ? <FeaturedMoviesEditor /> : <ShowtimesEditor />}
    </main>
  );
}
