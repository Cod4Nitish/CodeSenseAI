export default function SeverityBadge({ severity }) {
  const map = {
    high:   { label: "HIGH",   cls: "badge-high" },
    medium: { label: "MEDIUM", cls: "badge-medium" },
    low:    { label: "LOW",    cls: "badge-low" },
  };
  const { label, cls } = map[severity] ?? { label: severity?.toUpperCase(), cls: "" };
  return (
    <span className={`severity-badge ${cls}`} title={`${severity} severity`}>
      {label}
    </span>
  );
}
