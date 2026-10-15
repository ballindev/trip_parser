/**
 * Semantic UI class tokens (Toss cool-gray palette).
 * Colors: app/globals.css
 */

/** App shell canvas */
export const uiCanvas = "bg-surface-subtle";

/** Cool-gray page / directory background */
export const uiPage = "bg-surface-muted";

/** White elevated panel */
export const uiPanel =
  "rounded-2xl border border-edge bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.05)]";

/** Panel header divider */
export const uiPanelHeader = "border-b border-edge";

/** Soft card inside a panel */
export const uiCard =
  "rounded-2xl border border-edge bg-surface shadow-[0_1px_2px_rgba(25,31,40,0.06),0_2px_8px_rgba(25,31,40,0.06)]";

/** Inset / form-row surface */
export const uiInset = "bg-surface-subtle";

/** List / option row */
export const uiRowSelected = "bg-selected";
export const uiRowIdle = "hover:bg-surface-subtle";

export function uiRowClassName(selected: boolean): string {
  return selected ? uiRowSelected : uiRowIdle;
}

/** Soft selected chip / muted chip */
export const uiChipSelected = "bg-selected text-accent";
export const uiChipMuted = "bg-surface-inset text-ink-subtle";

/** Buttons */
export const uiBtnPrimary =
  "bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-edge-drag disabled:hover:bg-edge-drag";
export const uiBtnGhost =
  "bg-surface-muted text-ink-subtle transition-colors hover:bg-edge disabled:cursor-not-allowed disabled:opacity-40";
export const uiBtnMuted =
  "bg-surface-muted text-ink-secondary transition-colors hover:bg-edge";
export const uiBtnDanger =
  "bg-danger text-white transition-colors hover:bg-danger-hover";

export const uiBtnOutlineAccent =
  "border border-edge bg-surface text-ink-subtle transition-colors hover:border-accent hover:bg-selected hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-edge disabled:hover:bg-surface disabled:hover:text-ink-subtle";

export const uiSegmentTrack = "rounded-xl bg-surface-muted p-1";

export const uiFocusRing =
  "outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

export const uiField =
  `rounded-xl border border-edge bg-surface-subtle ${uiFocusRing} focus:bg-surface`;

export const uiDashedCta =
  "border border-dashed border-edge-strong bg-surface text-accent transition-colors hover:border-accent hover:bg-selected";
