import { ElectionStatus } from "@/components/site/ElectionStatus";

export function ElectionDayBanner({ compact = false }: { compact?: boolean }) {
  return <ElectionStatus compact={compact} />;
}
