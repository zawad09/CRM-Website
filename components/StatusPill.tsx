import { STATUS_META } from "@/lib/constants";
import type { EnquiryStatus } from "@/lib/types";

export function StatusPill({ status }: { status: EnquiryStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${meta.pill}`}
    >
      {meta.label}
    </span>
  );
}
