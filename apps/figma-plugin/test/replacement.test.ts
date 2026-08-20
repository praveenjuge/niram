import { describe, expect, it } from "vitest";
import {
  completeReplacementScope,
  replacementScopeError,
  type ReplacementAvailability,
  type ReplacementScope,
} from "../src/replacement";

const allAvailable: ReplacementAvailability = {
  theme: true,
  designSystem: true,
  components: true,
  blocks: true,
};

function scope(
  values: Partial<ReplacementScope> = {},
): ReplacementScope {
  return {
    theme: false,
    designSystem: false,
    components: false,
    blocks: false,
    ...values,
  };
}

describe("replacement dependencies", () => {
  it("allows theme-only and blocks-only replacement when dependencies exist", () => {
    expect(completeReplacementScope(scope({ theme: true }), allAvailable)).toEqual(
      scope({ theme: true }),
    );
    expect(
      completeReplacementScope(scope({ blocks: true }), allAvailable),
    ).toEqual(scope({ blocks: true }));
  });

  it("rebuilds downstream regions when their main components are replaced", () => {
    expect(
      completeReplacementScope(scope({ designSystem: true }), allAvailable),
    ).toEqual(
      scope({ designSystem: true, components: true, blocks: true }),
    );
    expect(
      completeReplacementScope(scope({ components: true }), allAvailable),
    ).toEqual(scope({ components: true, blocks: true }));
  });

  it("requires only prerequisites that are missing", () => {
    const missingComponents = { ...allAvailable, components: false };
    expect(
      completeReplacementScope(scope({ blocks: true }), missingComponents),
    ).toEqual(scope({ components: true, blocks: true }));

    const missingEverything: ReplacementAvailability = {
      theme: false,
      designSystem: false,
      components: false,
      blocks: false,
    };
    expect(
      completeReplacementScope(scope({ blocks: true }), missingEverything),
    ).toEqual({
      theme: true,
      designSystem: true,
      components: true,
      blocks: true,
    });
  });

  it("rejects empty or incomplete scopes before mutation", () => {
    expect(replacementScopeError(scope(), allAvailable)).toMatch(
      /at least one/i,
    );
    expect(
      replacementScopeError(scope({ designSystem: true }), allAvailable),
    ).toContain("Components");
    expect(
      replacementScopeError(
        scope({ designSystem: true, components: true, blocks: true }),
        allAvailable,
      ),
    ).toBeNull();
  });
});
