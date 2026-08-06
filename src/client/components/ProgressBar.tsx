export function ProgressBar({ complete, total }: { complete: number; total: number }) {
  const percent = total ? Math.round((complete / total) * 100) : 0;
  return (
    <div className="progress" aria-label={`${percent}% complete`}>
      <span className="progress__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

