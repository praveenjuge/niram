import { describe, expect, it } from "vitest";
import { createDesignSystemContext } from "../../src/designSystem/context";
import type { DesignSystemInputs } from "../../src/designSystem";

// A minimal theme map stub: only the keys the context looks up matter.
function fakeVar(id: string) {
  return { id } as unknown as Variable;
}

function makeInputs(
  light: Record<string, ReturnType<typeof fakeVar>>,
): DesignSystemInputs {
  return {
    presetCode: "test",
    tailwindColors: new Map(),
    primitives: new Map(),
    theme: {
      light: new Map(
        Object.entries(light),
      ) as DesignSystemInputs["theme"]["light"],
      dark: new Map() as DesignSystemInputs["theme"]["dark"],
    },
  };
}

describe("createDesignSystemContext", () => {
  it("snapshots the light-scheme chrome variables", () => {
    const inputs = makeInputs({
      background: fakeVar("bg"),
      card: fakeVar("card"),
      foreground: fakeVar("fg"),
      "muted-foreground": fakeVar("muted"),
      border: fakeVar("border"),
      input: fakeVar("input"),
      primary: fakeVar("primary"),
    });

    const ctx = createDesignSystemContext(inputs);
    expect(ctx.background?.id).toBe("bg");
    expect(ctx.card?.id).toBe("card");
    expect(ctx.foreground?.id).toBe("fg");
    expect(ctx.mutedForeground?.id).toBe("muted");
    expect(ctx.border?.id).toBe("border");
    expect(ctx.input?.id).toBe("input");
    expect(ctx.primary?.id).toBe("primary");
  });

  it("leaves missing variables undefined instead of throwing", () => {
    const ctx = createDesignSystemContext(makeInputs({}));
    expect(ctx.background).toBeUndefined();
    expect(ctx.foreground).toBeUndefined();
    expect(ctx.mutedForeground).toBeUndefined();
    expect(ctx.border).toBeUndefined();
  });
});
