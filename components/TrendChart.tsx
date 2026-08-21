/** Dependency-free bar chart for the 14-day intake trend. */
export function TrendChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((point) => point.count));

  return (
    <div className="flex h-32 items-end gap-1.5" role="img" aria-label="Leads received over the last 14 days">
      {data.map((point) => {
        const heightPercent = (point.count / max) * 100;
        const label = new Date(point.date).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
        });

        return (
          <div
            key={point.date}
            className="group relative flex flex-1 flex-col justify-end"
            title={`${label}: ${point.count} lead${point.count === 1 ? '' : 's'}`}
          >
            <div
              // A visible sliver keeps empty days from looking like missing data.
              style={{ height: `${Math.max(heightPercent, 3)}%` }}
              className={`w-full rounded-t transition-colors ${
                point.count > 0
                  ? 'bg-brand-500 group-hover:bg-brand-600'
                  : 'bg-slate-200'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
