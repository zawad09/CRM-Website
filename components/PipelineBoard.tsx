"use client";

import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { INTEREST_META, SOURCE_META, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { isStale } from "@/lib/stale";
import { relativeTime } from "@/lib/time";
import type { EnquiryStatus, SerializedEnquiry } from "@/lib/types";

type Props = {
  items: SerializedEnquiry[];
  onMove: (id: string, status: EnquiryStatus) => void;
  onOpen: (enquiry: SerializedEnquiry) => void;
};

export function PipelineBoard({ items, onMove, onOpen }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    const activeId = event.active.id;
    if (typeof overId !== "string" || typeof activeId !== "string") return;
    if (!(STATUS_ORDER as string[]).includes(overId)) return;
    onMove(activeId, overId as EnquiryStatus);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        {STATUS_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            items={items.filter((e) => e.status === status)}
            onOpen={onOpen}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({
  status,
  items,
  onOpen,
}: {
  status: EnquiryStatus;
  items: SerializedEnquiry[];
  onOpen: (enquiry: SerializedEnquiry) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];

  return (
    <section
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-lg border bg-stone-100/80 ${
        isOver ? "border-teal-400 ring-2 ring-teal-700/15" : "border-neutral-200"
      }`}
    >
      <header className="flex items-center justify-between px-3 py-2.5">
        <h2 className="text-[13px] font-medium text-neutral-700">{meta.label}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">
          {items.length}
        </span>
      </header>
      <ul className="flex min-h-24 flex-col gap-2 px-2 pb-3">
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
            Drop here
          </li>
        ) : (
          items.map((item) => <Card key={item._id} enquiry={item} onOpen={onOpen} />)
        )}
      </ul>
    </section>
  );
}

function Card({
  enquiry,
  onOpen,
}: {
  enquiry: SerializedEnquiry;
  onOpen: (enquiry: SerializedEnquiry) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: enquiry._id,
  });
  const stale = isStale(enquiry);

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      className={`rounded-md border border-neutral-200 bg-white p-3 shadow-sm ${
        isDragging ? "z-10 opacity-80 shadow-md" : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <button type="button" className="w-full text-left" onClick={() => onOpen(enquiry)}>
        <p className="text-sm font-medium text-neutral-900">{enquiry.name ?? "Unnamed"}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{enquiry.phone ?? "No phone"}</p>
        <p className="mt-1 text-xs text-neutral-500">
          {enquiry.interest ? INTEREST_META[enquiry.interest].label : "Interest unknown"} ·{" "}
          {SOURCE_META[enquiry.source].label}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {stale ? (
            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              48h+
            </span>
          ) : null}
          {enquiry.needsReview ? (
            <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
              Check
            </span>
          ) : null}
          <span className="ml-auto text-[10px] text-neutral-400">
            {relativeTime(enquiry.lastActivityAt)}
          </span>
        </div>
      </button>
    </li>
  );
}
