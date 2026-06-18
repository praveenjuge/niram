// Message contract between the Figma plugin sandbox (code.ts) and UI (ui.ts).

import type { ProgressPhase, ProgressRegion } from "./progress";

export type UiToPlugin = {
  type: "generate";
  presetCode: string;
  // Set when the user has confirmed Niram's inline "replace everything" prompt,
  // so the sandbox skips the existence check and regenerates in place.
  confirmReplace?: boolean;
};

export type PluginToUi =
  | { type: "ready"; command?: string }
  // Niram already exists in the file. The sandbox asks the UI to show an inline
  // confirmation (in place of the Generate button) before doing a destructive
  // regenerate; the UI resends `generate` with `confirmReplace` if the user
  // agrees.
  | { type: "awaiting-confirmation"; message: string }
  | {
      type: "progress";
      // Human-readable detail line for the current phase. Kept as `message`
      // for back-compat with older UI/tests.
      message: string;
      // Phase-weighted determinate progress. `percent` is monotonic and only
      // reaches 100 on `done`; `phase`/`region`/`detail` drive the stage panel.
      phase?: ProgressPhase;
      region?: ProgressRegion;
      detail?: string;
      percent?: number;
      elapsedMs?: number;
      // Legacy section counters. Retained as optional so any caller/test that
      // still reads them keeps working; the bar now prefers `percent`.
      step?: number;
      total?: number;
    }
  | {
      type: "done";
      presetCode: string;
      summary: {
        collections: { name: string; variableCount: number }[];
        fallbackThemeColors: number;
        designSystemNodes: number;
        componentsNodes: number;
        blocksNodes: number;
      };
      // Total wall-clock time for the run, surfaced in the done summary.
      elapsedMs?: number;
      // Non-fatal notes (e.g. theme colors that fell back to literal values).
      // Always present; empty when the run was clean.
      warnings: string[];
    }
  | { type: "error"; message: string };
