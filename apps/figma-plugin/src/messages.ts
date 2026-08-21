// Message contract between the Figma plugin sandbox (code.ts) and UI (ui.ts).

import type { ProgressPhase, ProgressRegion } from "./progress";
import type { ThemingStrategy } from "./theming";
import type {
  ReplacementAvailability,
  ReplacementScope,
} from "./replacement";

export type UiToPlugin =
  | {
      type: "generate";
      presetCode: string;
      // Set when the user has confirmed Niram's inline "replace everything" prompt,
      // so the sandbox skips the existence check and regenerates in place.
      confirmReplace?: boolean;
      replacementScope?: ReplacementScope;
      // Theming strategy for the `shadcn / Theme` collection. Absent = twins.
      theming?: { strategy: ThemingStrategy };
    }
  // Persists the UI's theming-strategy selection (figma.clientStorage) so the
  // next session opens with the same choice.
  | { type: "set-theming"; strategy: ThemingStrategy };

export type PluginToUi =
  | { type: "ready"; command?: string }
  // Follows `ready` once the sandbox has probed the file's multi-mode support
  // (there is no plan API — a scratch addMode try/catch is the detection) and
  // read the persisted strategy. The UI uses this to gate the "Variable modes"
  // option: unavailable on free/Starter tiers, which cap collections at one mode.
  | { type: "theming-state"; strategy: ThemingStrategy; modesAvailable: boolean }
  // Niram already exists. The sandbox asks the UI to show an inline
  // confirmation (in place of the Generate button) before doing a destructive
  // regenerate; the UI resends `generate` with `confirmReplace` if the user
  // agrees. `themingChange` is set when the requested strategy differs from
  // the existing collection's recorded one.
  | {
      type: "awaiting-confirmation";
      message: string;
      availability: ReplacementAvailability;
      themingChange?: { from: ThemingStrategy; to: ThemingStrategy } | null;
    }
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
