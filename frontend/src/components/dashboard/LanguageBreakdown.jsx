/**
 * CodeSense AI — per-language review breakdown.
 * by Nitish Singh
 */

import { langColor, langLabel } from "../../lib/format";

export default function LanguageBreakdown({ items }) {
  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <div className="panel">
      <div className="panel-head">
        <h3 className="panel-title">By Language</h3>
        <span className="panel-meta">{items.length} language{items.length !== 1 ? "s" : ""}</span>
      </div>

      {total === 0 ? (
        <div className="audit-empty"><p>No reviews yet.</p></div>
      ) : (
        <ul className="lang-list">
          {items.map((it) => (
            <li className="lang-row" key={it.language}>
              <span className="lang-chip" style={{ "--lang": langColor(it.language) }}>
                {langLabel(it.language)}
              </span>
              <div className="lang-meter">
                <div
                  className="lang-meter-fill"
                  style={{ width: `${(it.count / total) * 100}%`, background: langColor(it.language) }}
                />
              </div>
              <span className="lang-count">{it.count}</span>
              <span className="lang-avg">avg {it.avg_score.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
