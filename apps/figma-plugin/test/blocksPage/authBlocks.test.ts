import { describe, expect, it } from "vitest";
import { addLoginSocialBlock } from "../../src/blocksPage/blocks/loginSocial";
import { addLoginCardBlock } from "../../src/blocksPage/blocks/loginCard";
import { addSignupSocialBlock } from "../../src/blocksPage/blocks/signupSocial";
import { addSignupCardBlock } from "../../src/blocksPage/blocks/signupCard";
import type { BlocksInputs } from "../../src/blocksPage";
import { buildComponentsPage } from "../../src/componentsPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

type Root = { figma: { root: { children: { type: string; name: string }[] } } };

// Build the Components grid first so the new auth blocks can reuse live
// instances of the page-built Button / Input / Label components, exactly like
// the live run. Returns inputs that target the shared Niram page.
async function makeInputsOnComponentsPage(
  code = "b2fA",
): Promise<BlocksInputs> {
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
  });
  const componentsInputs = {
    presetCode: code,
    primitives: generated.variables.primitives,
    tailwindColors: generated.variables.tailwindColors,
    theme: generated.variables.theme,
  };
  await buildComponentsPage(componentsInputs);
  const targetPage = (globalThis as unknown as Root).figma.root.children.find(
    (c) => c.type === "PAGE" && c.name === "Niram",
  ) as unknown as PageNode;
  return { ...componentsInputs, targetPage };
}

type FakeNode = {
  type: string;
  name: string;
  characters?: string;
  children?: FakeNode[];
};

function collect(
  node: FakeNode,
  predicate: (n: FakeNode) => boolean,
): FakeNode[] {
  const out: FakeNode[] = [];
  const visit = (n: FakeNode) => {
    if (predicate(n)) out.push(n);
    for (const child of n.children ?? []) visit(child);
  };
  visit(node);
  return out;
}

function texts(node: FakeNode): string[] {
  return collect(node, (n) => n.type === "TEXT").map((n) => n.characters ?? "");
}

function lastChild(page: { children: FakeNode[] }): FakeNode {
  return page.children[page.children.length - 1]!;
}

describe("login-03 / login-05 social card block", () => {
  it("renders the welcome-back copy and reuses component instances", async () => {
    const inputs = await makeInputsOnComponentsPage();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };

    const count = await addLoginSocialBlock(page as never, inputs);
    expect(count).toBeGreaterThan(0);

    const block = lastChild(page);
    expect(block.name).toBe("Login (Social)");
    const allText = texts(block).join(" | ");
    expect(allText).toContain("Welcome back");
    expect(allText).toContain("Or continue with");
    expect(allText).toContain("Forgot your password?");
    // login-03 shows a centered brand lockup above the card.
    expect(collect(block, (n) => n.name === "Brand").length).toBe(1);
    // Social-first + email/password + submit reuse live Button/Input instances.
    expect(collect(block, (n) => n.type === "INSTANCE").length).toBeGreaterThan(
      0,
    );
  });
});

describe("login-04 split card block", () => {
  it("renders a split form + cover with a 3-up social grid", async () => {
    const inputs = await makeInputsOnComponentsPage();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };

    await addLoginCardBlock(page as never, inputs);
    const block = lastChild(page);
    expect(block.name).toBe("Login (Card)");

    const allText = texts(block).join(" | ");
    expect(allText).toContain("Welcome back");
    expect(allText).toContain("Login to your Acme Inc account");
    // The cover panel is present beside the form.
    expect(collect(block, (n) => n.name === "Cover").length).toBe(1);
    // The 3-up social row holds three icon buttons.
    const row = collect(block, (n) => n.name === "Socials")[0];
    expect(row).toBeDefined();
    expect((row!.children ?? []).length).toBe(3);
  });
});

describe("signup-03 social card block", () => {
  it("renders a name + email + password/confirm grid", async () => {
    const inputs = await makeInputsOnComponentsPage();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };

    await addSignupSocialBlock(page as never, inputs);
    const block = lastChild(page);
    expect(block.name).toBe("Signup (Card)");

    const allText = texts(block).join(" | ");
    expect(allText).toContain("Create your account");
    expect(allText).toContain("Must be at least 8 characters long.");
    // signup-03 shows a centered brand lockup above the card.
    expect(collect(block, (n) => n.name === "Brand").length).toBe(1);
    // The password/confirm grid holds two field cells side by side.
    const grid = collect(block, (n) => n.name === "Password Grid")[0];
    expect(grid).toBeDefined();
    expect((grid!.children ?? []).length).toBe(2);
  });
});

describe("signup-04 split card block", () => {
  it("renders a split form + cover with a 3-up social grid", async () => {
    const inputs = await makeInputsOnComponentsPage();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };

    await addSignupCardBlock(page as never, inputs);
    const block = lastChild(page);
    expect(block.name).toBe("Signup (Split)");

    const allText = texts(block).join(" | ");
    expect(allText).toContain("Create your account");
    expect(collect(block, (n) => n.name === "Cover").length).toBe(1);
    const row = collect(block, (n) => n.name === "Socials")[0];
    expect(row).toBeDefined();
    expect((row!.children ?? []).length).toBe(3);
    // The two-up Password / Confirm Password grid sits in the form.
    const grid = collect(block, (n) => n.name === "Password Grid")[0];
    expect(grid).toBeDefined();
    expect((grid!.children ?? []).length).toBe(2);
  });
});
