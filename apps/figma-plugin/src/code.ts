// Plugin sandbox entry. Runs in Figma's main thread and has access to the
// figma.* APIs.

import { buildComponentsPage } from "./componentsPage";
import { buildBlocksRegion } from "./blocksPage";
import { buildDesignSystem } from "./designSystem";
import {
  generateFromRegistry,
  loadExistingGeneratedAssets,
  withShadcnRadius,
} from "./generator";
import {
  collectIconComponents,
  detectIconLibrary,
  type IconComponentMap,
} from "./icons";
import { decodePreset } from "./preset";
import { resolvePreset } from "./registry";
import {
  loadAllPagesOnce,
  resetPageLoadCache,
} from "./async";
import {
  ProgressReporter,
  type ProgressCalibration,
} from "./progress";
import type { PluginToUi, UiToPlugin } from "./messages";
import {
  FULL_REPLACEMENT_SCOPE,
  replacementScopeError,
  type ReplacementAvailability,
  type ReplacementScope,
} from "./replacement";

// Root-level plugin data holding the previous run's per-phase durations so the
// next run's progress bar tracks real time (see ProgressReporter calibration).
const CALIBRATION_KEY = "niramProgressCalibration";

function readCalibration(): ProgressCalibration | undefined {
  try {
    const raw = figma.root.getPluginData(CALIBRATION_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return undefined;
    const clean: ProgressCalibration = {};
    for (const key of Object.keys(parsed as Record<string, unknown>)) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "number" && value > 0) clean[key] = value;
    }
    return Object.keys(clean).length > 0 ? clean : undefined;
  } catch {
    return undefined;
  }
}

function writeCalibration(measurements: ProgressCalibration): void {
  try {
    figma.root.setPluginData(CALIBRATION_KEY, JSON.stringify(measurements));
  } catch {
    // Calibration is best-effort; a host without root plugin data just keeps
    // the static progress plan.
  }
}

figma.showUI(__html__, { width: 360, height: 360, themeColors: true });

// `figma.command` is set when the plugin is launched from a manifest menu item
// (the Figma quick-actions command palette / Plugins submenu). It's "" when the
// plugin is run without a menu entry. Forward it so the UI can act on it (e.g.
// auto-shuffle when launched from the "Shuffle a random preset" command).
post({ type: "ready", command: figma.command || undefined });

figma.ui.onmessage = async (message: UiToPlugin) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "generate") {
    // Each run re-syncs with the document once; the shared promise in
    // loadAllPagesOnce dedupes the per-builder reloads within the run.
    resetPageLoadCache();
    await handleGenerate(
      message.presetCode,
      message.confirmReplace === true,
      message.replacementScope,
    );
  }
};

// True when a previous run already materialized Niram in this file. Everything
// Niram generates lives on a single page named "Niram", so its presence is the
// signal that regenerating would replace existing variables, styles, and the
// page contents. Reading a page's name/type is allowed without loading it,
// even under `documentAccess: "dynamic-page"`.
function niramAlreadyExists(): boolean {
  return figma.root.children.some(
    (child) => child.type === "PAGE" && child.name === "Niram",
  );
}

async function replacementAvailability(): Promise<ReplacementAvailability> {
  await loadAllPagesOnce();
  const page = figma.root.children.find(
    (child) => child.type === "PAGE" && child.name === "Niram",
  ) as PageNode | undefined;
  const regions = new Set<string>();
  let existingIcons: IconComponentMap = new Map();
  if (page) {
    for (const node of page.children) {
      const region = node.getPluginData("niramRegion");
      if (region) regions.add(region);
    }
    existingIcons = collectIconComponents(page as unknown as SceneNode);
  }
  const existing = await loadExistingGeneratedAssets("");
  return {
    theme: existing !== null,
    designSystem:
      regions.has("design-system") && existingIcons.size > 0,
    components: regions.has("components"),
    blocks: regions.has("blocks"),
  };
}

async function handleGenerate(
  rawCode: string,
  confirmReplace: boolean,
  requestedScope?: ReplacementScope,
) {
  const presetCode = rawCode.trim();

  // The user already confirmed the destructive replace in the UI, or there's
  // nothing to replace yet (first run / Niram page deleted): generate now.
  if (confirmReplace || !niramAlreadyExists()) {
    const scope = niramAlreadyExists()
      ? (requestedScope ?? FULL_REPLACEMENT_SCOPE)
      : FULL_REPLACEMENT_SCOPE;
    const availability = await replacementAvailability();
    const scopeError = replacementScopeError(scope, availability);
    if (scopeError) {
      post({ type: "error", message: scopeError });
      return;
    }
    await runGenerate(presetCode, scope);
    return;
  }

  // Validate the preset before asking the UI to prompt — no point warning about
  // a destructive replace for a code that can't resolve.
  const resolved = resolvePreset(presetCode);
  if (!resolved.ok) {
    post({ type: "error", message: resolved.error });
    return;
  }

  // Niram exists. Hand off to the UI to show its inline confirmation; it will
  // resend `generate` with `confirmReplace` if the user agrees.
  post({
    type: "awaiting-confirmation",
    message: "Niram already exists. Choose what to replace.",
    availability: await replacementAvailability(),
  });
}

async function runGenerate(presetCode: string, scope: ReplacementScope) {
  // One reporter per run: turns weighted phase updates into UI progress
  // messages with a determinate percent, elapsed time, and a detail line.
  // Weights come from the previous run's measured durations when available,
  // so the bar tracks real time instead of static guesses; this run records
  // fresh measurements for the next one.
  const progress = new ProgressReporter({
    calibration: readCalibration(),
    emit: (update) => {
      post({
        type: "progress",
        message: update.detail,
        phase: update.phase,
        region: update.region,
        detail: update.detail,
        percent: update.percent,
        elapsedMs: update.elapsedMs,
      });
    },
  });

  progress.phase("resolving");

  const resolved = resolvePreset(presetCode);
  if (!resolved.ok) {
    post({ type: "error", message: resolved.error });
    return;
  }

  progress.phase("variables");

  try {
    const decoded = decodePreset(presetCode) ?? undefined;
    const presetSummary = decoded
      ? {
          style: decoded.style,
          baseColor: decoded.baseColor,
          theme: decoded.theme,
          font: decoded.font,
          fontHeading: decoded.fontHeading,
          radius: decoded.radius,
          iconLibrary: decoded.iconLibrary,
        }
      : undefined;

    const result = scope.theme
      ? await generateFromRegistry(resolved.data, {
          presetCode: resolved.presetCode,
          presetSummary,
        })
      : await loadExistingGeneratedAssets(resolved.presetCode);
    if (!result) {
      throw new Error(
        "Theme & tokens are missing. Select Theme & tokens and try again.",
      );
    }

    // Components and blocks bind their corners to the preset-driven shadcn
    // radius scale (which lives in `shadcn / Theme`), not the fixed Tailwind
    // `radius/*` primitives. Overlay that scale onto the primitives map so the
    // create-preset radius choice flows through every component/block while the
    // Design System reference keeps the canonical Tailwind scale.
    const componentPrimitives = withShadcnRadius(
      result.variables.primitives,
      result.variables.radiusScale,
    );

    await loadAllPagesOnce();
    let niramPage = figma.root.children.find(
      (child) => child.type === "PAGE" && child.name === "Niram",
    ) as PageNode | undefined;
    const storedIconLibrary = niramPage
      ? niramPage.getPluginData("niramIconLibrary")
      : "";
    const existingIconComponents = niramPage
      ? collectIconComponents(niramPage as unknown as SceneNode)
      : new Map();
    const detectedIconLibrary = detectIconLibrary(existingIconComponents);
    const activeIconLibrary = scope.designSystem
      ? presetSummary?.iconLibrary
      : storedIconLibrary || detectedIconLibrary || presetSummary?.iconLibrary;
    const builderPresetSummary = {
      ...presetSummary,
      iconLibrary: activeIconLibrary,
    };

    let designSystemNodes = 0;
    let iconComponents: IconComponentMap = new Map();
    if (scope.designSystem) {
      const ds = await buildDesignSystem({
        presetCode: result.presetCode,
        presetSummary: builderPresetSummary,
        tailwindColors: result.variables.tailwindColors,
        primitives: result.variables.primitives,
        theme: result.variables.theme,
        fonts: result.fonts,
        fontVars: result.variables.fonts,
        effectStyles: result.effectStyles,
        textStyles: result.textStyles,
        onProgress: progress.region("design-system"),
      });
      designSystemNodes = ds.nodeCount;
      iconComponents = ds.iconComponents;
      niramPage = figma.root.children.find(
        (child) => child.type === "PAGE" && child.name === "Niram",
      ) as PageNode | undefined;
      if (niramPage) {
        niramPage.setPluginData("niramIconLibrary", activeIconLibrary || "lucide");
      }
    } else if (niramPage) {
      iconComponents = existingIconComponents;
    }

    const components = scope.components
      ? await buildComponentsPage({
          presetCode: result.presetCode,
          presetSummary: builderPresetSummary,
          tailwindColors: result.variables.tailwindColors,
          primitives: componentPrimitives,
          theme: result.variables.theme,
          fonts: result.fonts,
          fontVars: result.variables.fonts,
          effectStyles: result.effectStyles,
          textStyles: result.textStyles,
          iconComponents,
          onProgress: progress.region("components"),
        })
      : { nodeCount: 0 };

    // Everything Niram generates lives on one page (Figma's Starter tier caps
    // a file at 3 pages). The Design System sections render at the top, the
    // Components grid below them, and the blocks region to the right of the
    // grid. The page is resolvable by name here (loadAllPagesAsync ran inside
    // buildComponentsPage) and already holds every component the blocks reuse as
    // live instances.
    const componentsPage = figma.root.children.find(
      (child) => child.type === "PAGE" && child.name === "Niram",
    ) as PageNode | undefined;

    const blocks = scope.blocks && componentsPage
      ? await buildBlocksRegion({
          presetCode: result.presetCode,
          presetSummary: builderPresetSummary,
          tailwindColors: result.variables.tailwindColors,
          primitives: componentPrimitives,
          theme: result.variables.theme,
          fonts: result.fonts,
          fontVars: result.variables.fonts,
          effectStyles: result.effectStyles,
          textStyles: result.textStyles,
          iconComponents,
          targetPage: componentsPage,
          onProgress: progress.region("blocks"),
        })
      : { nodeCount: 0 };

    // Non-fatal notes the run should surface without failing. (The theme-color
    // fallback to literal values is normal for most presets, so it's tracked in
    // the summary count but not surfaced as a warning.)
    const warnings: string[] = [];

    progress.finish();
    writeCalibration(progress.measurements());

    post({
      type: "done",
      presetCode: result.presetCode,
      summary: {
        collections: result.collections,
        fallbackThemeColors: result.fallbackThemeColors,
        designSystemNodes,
        componentsNodes: components.nodeCount,
        blocksNodes: blocks.nodeCount,
      },
      elapsedMs: progress.elapsed(),
      warnings,
    });

    const variableTotal = result.collections.reduce(
      (acc, collection) => acc + collection.variableCount,
      0,
    );
    const replaced: string[] = [];
    if (scope.theme) replaced.push(`${variableTotal} variables`);
    if (scope.designSystem) replaced.push(`Design System (${designSystemNodes} nodes)`);
    if (scope.components) replaced.push(`Components (${components.nodeCount} nodes)`);
    if (scope.blocks) replaced.push(`Blocks (${blocks.nodeCount} nodes)`);
    figma.notify(`Niram: replaced ${replaced.join(" · ")}.`);
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Unknown error.";
    post({ type: "error", message: messageText });
    figma.notify(`Niram failed: ${messageText}`, { error: true });
  }
}

function post(message: PluginToUi) {
  figma.ui.postMessage(message);
}
