import { SAMPLE_LABEL } from "@/lib/placeholders";

export function SampleBanner() {
  return (
    <p className="rounded-md border border-line bg-card px-3 py-2 text-sm leading-6 text-muted">
      <span className="mr-2 inline-block rounded bg-paper px-1.5 py-0.5 text-xs font-semibold tracking-wide text-ink uppercase">
        {SAMPLE_LABEL}
      </span>
      Placeholder layout. These names are not candidates and are not from a
      filing.
    </p>
  );
}
