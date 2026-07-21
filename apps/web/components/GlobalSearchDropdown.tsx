import React, { useState } from "react";
import { Icon } from "@/components/icons/Icon";

export default function GlobalSearchDropdown({ onClose }: { onClose: () => void }) {
  const [activeFilter, setActiveFilter] = useState("Tous");

  const filters = ["Tous", "Canaux", "Tâches", "Projets", "Tags"];

  const dummyResults = [
    {
      id: 1,
      type: "Projets",
      title: "Projet Alpha",
      meta: "dans Projets • il y a 4h",
      icon: <Icon name="i-folder" size={14} />,
    },
    {
      id: 2,
      type: "Tâches",
      title: "Mettre à jour le portfolio",
      meta: "dans Tâches • il y a 1j",
      icon: <Icon name="i-check" size={14} />,
    },
    {
      id: 3,
      type: "Canaux",
      title: "général",
      meta: "dans Canaux • il y a 2j",
      icon: <Icon name="i-list" size={14} />,
    },
    {
      id: 4,
      type: "Tags",
      title: "urgent",
      meta: "dans Tags • il y a 3j",
      icon: <Icon name="i-tag" size={14} />,
    },
  ];

  const filteredResults =
    activeFilter === "Tous" ? dummyResults : dummyResults.filter((r) => r.type === activeFilter);

  return (
    <div className="global-search-dropdown" onClick={(e) => e.stopPropagation()}>
      {/* Filtres */}
      <div className="gsd-filters">
        {filters.map((filter) => (
          <button
            key={filter}
            className={`gsd-filter-btn ${activeFilter === filter ? "is-active" : ""}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Résultats */}
      <div className="gsd-results">
        {filteredResults.length > 0 ? (
          filteredResults.map((result) => (
            <div key={result.id} className="gsd-result-item" onClick={onClose}>
              <div className="gsd-result-icon">{result.icon}</div>
              <div className="gsd-result-content">
                <div className="gsd-result-title">{result.title}</div>
                <div className="gsd-result-meta">{result.meta}</div>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "13px",
            }}
          >
            Aucun résultat trouvé pour "{activeFilter}"
          </div>
        )}
      </div>

      {/* Footer avec raccourcis */}
      <div className="gsd-footer">
        <div>
          Appuyez sur <kbd className="gsd-shortcut">↵</kbd> pour ouvrir
        </div>
        <div>
          <kbd className="gsd-shortcut">↑</kbd> <kbd className="gsd-shortcut">↓</kbd> pour naviguer
        </div>
      </div>
    </div>
  );
}
