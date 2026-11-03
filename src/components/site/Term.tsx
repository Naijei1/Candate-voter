export function Term({ children, tip }: { children: string; tip: string }) {
  return (
    <span className="term" tabIndex={0} title={tip}>
      {children}
      <span className="term-tip" role="tooltip">
        {tip}
      </span>
    </span>
  );
}
