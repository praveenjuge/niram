// Replacement scope and dependency rules shared by the iframe UI and the
// QuickJS sandbox. Kept pure so the UI can preview required selections and the
// sandbox can enforce the exact same safety rules before mutating the document.

export type ReplacementScope = {
  theme: boolean;
  designSystem: boolean;
  components: boolean;
  blocks: boolean;
};

export type ReplacementAvailability = ReplacementScope;

export const FULL_REPLACEMENT_SCOPE: ReplacementScope = {
  theme: true,
  designSystem: true,
  components: true,
  blocks: true,
};

export function completeReplacementScope(
  requested: ReplacementScope,
  available: ReplacementAvailability,
): ReplacementScope {
  const scope: ReplacementScope = { ...requested };

  // Rebuilding an upstream region deletes and recreates main components used
  // by downstream instances, so those downstream regions must rebuild too.
  if (scope.designSystem) {
    scope.components = true;
    scope.blocks = true;
  }
  if (scope.components) scope.blocks = true;

  // A selected downstream region may reuse an unchecked prerequisite only when
  // that prerequisite already exists in a compatible Niram document.
  if (scope.blocks && !scope.components && !available.components) {
    scope.components = true;
  }
  if (scope.components && !scope.designSystem && !available.designSystem) {
    scope.designSystem = true;
  }

  // The two rules above can introduce a new upstream selection; close the
  // downstream chain after that happens.
  if (scope.designSystem) scope.components = true;
  if (scope.components) scope.blocks = true;

  const replacesRegion =
    scope.designSystem || scope.components || scope.blocks;
  if (replacesRegion && !available.theme) scope.theme = true;

  return scope;
}

export function replacementScopeError(
  requested: ReplacementScope,
  available: ReplacementAvailability,
): string | null {
  if (
    !requested.theme &&
    !requested.designSystem &&
    !requested.components &&
    !requested.blocks
  ) {
    return "Select at least one item to replace.";
  }

  const required = completeReplacementScope(requested, available);
  const missing: string[] = [];
  if (required.theme && !requested.theme) missing.push("Theme & tokens");
  if (required.designSystem && !requested.designSystem) {
    missing.push("Design System");
  }
  if (required.components && !requested.components) missing.push("Components");
  if (required.blocks && !requested.blocks) missing.push("Blocks");
  if (missing.length === 0) return null;
  return `Also select ${missing.join(", ")} to keep generated dependencies valid.`;
}

export function sameReplacementScope(
  a: ReplacementScope,
  b: ReplacementScope,
): boolean {
  return (
    a.theme === b.theme &&
    a.designSystem === b.designSystem &&
    a.components === b.components &&
    a.blocks === b.blocks
  );
}
