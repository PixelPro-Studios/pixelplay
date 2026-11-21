"use client";

import { Icon, ItemIcon } from "@/components/builder/icons";
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, KINDS_BY_CATEGORY, type Category } from "@/lib/builder/catalog";
import type { ItemKind } from "@/lib/builder/types";
import { usePlayStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";

export const CATEGORY_TONE: Record<Category, string> = {
  stage: "bg-[#ddf5f0] text-[#086354]",
  audio: "bg-[#e6eafe] text-[#3346b8]",
  lighting: "bg-[#fdf0d8] text-[#9a5b00]",
  extras: "bg-[#fde7ee] text-[#b02a59]",
};

function useCounts(): Record<ItemKind, number> {
  const placements = usePlayStore((s) => s.placements);
  const counts = {} as Record<ItemKind, number>;
  for (const k of Object.keys(CATALOG) as ItemKind[]) counts[k] = 0;
  for (const p of placements) counts[p.kind] += 1;
  return counts;
}

function startDrag(kind: ItemKind, e: React.PointerEvent) {
  if (e.button !== 0) return;
  e.preventDefault();
  usePlayStore.getState().beginDrag({ mode: "new", kind, startX: e.clientX, startY: e.clientY });
}

function ItemCard({ kind, count, compact }: { kind: ItemKind; count: number; compact?: boolean }) {
  const pointerType = useRef<string | null>(null);
  const item = CATALOG[kind];
  const full = count >= item.max;
  const changeQuantity = (direction: 1 | -1) => {
    const store = usePlayStore.getState();
    const selected = store.selectedId;
    if (direction === 1) {
      store.autoAdd(kind);
      // Quick quantity changes keep the room visible instead of opening the inspector.
      store.select(selected);
    } else {
      const last = store.placements.filter(p => p.kind === kind).at(-1);
      if (last) store.removeItem(last.id);
    }
  };
  return (
    <div className={`gear-card rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow-xs)] ${compact ? "w-44 shrink-0" : "w-full"}`}>
      <button
        type="button"
        onPointerDown={(e) => { pointerType.current = e.pointerType; if (e.pointerType !== "touch" && !full) startDrag(kind, e); }}
        onClick={(e) => { if (e.detail === 0 || pointerType.current === "touch") changeQuantity(1); }}
        disabled={full}
        title={`${item.blurb} Drag onto the grid, or use + to auto-place.`}
        aria-label={`Add ${item.label}`}
        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg text-left disabled:opacity-50"
        style={{ touchAction: "pan-x pan-y" }}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${CATEGORY_TONE[item.category]}`}><ItemIcon kind={kind} /></span>
        <span className="min-w-0"><span className="block text-[0.8125rem] font-semibold text-[var(--ink)]">{item.label}</span><span className="block text-[11px] text-[var(--ink-muted)]">{item.priceHint}</span></span>
      </button>
      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-muted)]" role="group" aria-label={`${item.label} quantity`}>
        <button type="button" className="quantity-button" aria-label={`Remove one ${item.label}`} disabled={count === 0} onClick={() => changeQuantity(-1)}><Icon name="minus" /></button>
        <output aria-live="polite" aria-label={`${item.label} count`} className="text-sm font-semibold tabular-nums text-[var(--ink)]">{count}</output>
        <button type="button" className="quantity-button" aria-label={`Add one ${item.label}`} disabled={full} onClick={() => changeQuantity(1)}><Icon name="plus" /></button>
      </div>
    </div>
  );
}

/** Desktop sidebar: every category, stacked. */
export function Palette() {
  const counts = useCounts();
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--line)] bg-white/70 backdrop-blur-xl">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="font-silkscreen text-[11px] text-[var(--accent-ink)]">GEAR</p>
        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Drag onto the grid, or click to auto-place.</p>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {CATEGORY_ORDER.map((cat) => (
          <section key={cat}>
            <h3 className="eyebrow mb-2 px-1">{CATEGORY_LABELS[cat]}</h3>
            <div className="grid gap-2">
              {KINDS_BY_CATEGORY[cat].map((kind) => (
                <ItemCard key={kind} kind={kind} count={counts[kind]} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

/** Phone / small tablet: one horizontal strip above the HUD. */
export function PaletteDock() {
  const counts = useCounts();
  const selectedId = usePlayStore(s => s.selectedId);
  const select = usePlayStore(s => s.select);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("stage");
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  // Hide the tray while inspecting an item, without losing the chosen category.
  const expanded = open && !selectedId;
  return (
    <div className="mobile-gear shrink-0 border-t border-[var(--line)] bg-white/95 backdrop-blur-xl">
      <button type="button" className="flex min-h-12 w-full items-center justify-between px-4 text-sm font-semibold text-[var(--ink)]" aria-expanded={expanded} aria-controls="gear-tray" onClick={() => { select(null); setOpen(!expanded); }}>
        <span className="flex items-center gap-2"><Icon name="plus" /> Add equipment <span className="text-xs font-normal text-[var(--ink-muted)]">{total} in room</span></span><Icon name="chevronUp" className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded ? <div id="gear-tray">
        <div className="flex gap-1 overflow-x-auto px-3 pb-2" role="group" aria-label="Equipment categories">
          {CATEGORY_ORDER.map(cat => <button key={cat} type="button" aria-pressed={cat === category} onClick={() => setCategory(cat)} className={`min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold ${cat === category ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]" : "text-[var(--ink-muted)]"}`}>{CATEGORY_LABELS[cat]}</button>)}
        </div>
        <div className="flex gap-2 overflow-x-auto px-3 pb-3 [scrollbar-width:thin]">
          {KINDS_BY_CATEGORY[category].map(kind => <ItemCard key={kind} kind={kind} count={counts[kind]} compact />)}
        </div>
      </div> : null}
    </div>
  );
}

/** Chip that follows the pointer while gear is carried outside the canvas. */
export function DragChip() {
  const drag = usePlayStore((s) => s.drag);
  const overGrid = usePlayStore((s) => s.hover !== null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (drag?.mode !== "new") return;
    const el = ref.current;
    if (el) el.style.transform = `translate(${drag.startX + 12}px, ${drag.startY + 12}px)`;
    const move = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`;
    };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    return () => {
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
    };
  }, [drag]);

  if (drag?.mode !== "new") return null;
  const item = CATALOG[drag.kind];
  return (
    <div
      ref={ref}
      className={`pointer-events-none fixed top-0 left-0 z-[60] flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-2.5 py-1.5 shadow-[var(--shadow-lg)] transition-opacity ${
        overGrid ? "opacity-0" : "opacity-100"
      }`}
    >
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${CATEGORY_TONE[item.category]}`}>
        <ItemIcon kind={drag.kind} className="h-4 w-4" />
      </span>
      <span className="text-xs font-semibold text-[var(--ink)]">{item.label}</span>
    </div>
  );
}
