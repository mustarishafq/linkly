export default function CountryList({ clicks }) {
  const countryCounts = {};
  clicks.forEach((c) => {
    const country = c.country || "Unknown";
    countryCounts[country] = (countryCounts[country] || 0) + 1;
  });

  const sorted = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Country Distribution</h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No data</p>
      ) : (
        <div className="space-y-2.5">
          {sorted.slice(0, 15).map(([country, count]) => (
            <div key={country} className="flex items-center gap-3">
              <span className="text-sm w-32 truncate">{country}</span>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-12 text-right font-mono">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}