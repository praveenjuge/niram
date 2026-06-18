// Per-block fidelity coverage for all ten auth layouts (login-01..05 and
// signup-01..05). Each spec pins the exact copy shadcn's registry ships
// (verified against https://ui.shadcn.com/r/styles/new-york-v4/{block}.json),
// the field count, and the reused-component structure, so a builder that drifts
// from the official block fails here. Blocks render onto the shared Niram page
// so they reuse the live Button / Input / Label component instances, exactly
// like a live run.
//
// Note on what is asserted via text vs structure: the field labels and the
// button labels live *inside* reused component instances (Label / Input /
// Button). The Figma fake returns detached instances that carry only the source
// component's name (no inner text), mirroring how a designer's instance keeps
// its overrides at runtime but here exposes none. So copy that the block draws
// directly (titles, descriptions, separators, the "forgot" link, footer
// prompts, field descriptions, and terms notes) is asserted as exact text,
// while fields and buttons are asserted structurally by their instance names.

import { describe, expect, it } from "vitest";
import { addLoginBlock } from "../../src/blocksPage/blocks/login";
import { addLoginTwoColumnBlock } from "../../src/blocksPage/blocks/loginTwoColumn";
import { addLoginSocialBlock } from "../../src/blocksPage/blocks/loginSocial";
import { addLoginCardBlock } from "../../src/blocksPage/blocks/loginCard";
import { addLoginEmailBlock } from "../../src/blocksPage/blocks/loginEmail";
import { addSignupBlock } from "../../src/blocksPage/blocks/signup";
import { addSignupTwoColumnBlock } from "../../src/blocksPage/blocks/signupTwoColumn";
import { addSignupSocialBlock } from "../../src/blocksPage/blocks/signupSocial";
import { addSignupCardBlock } from "../../src/blocksPage/blocks/signupCard";
import { addSignupEmailBlock } from "../../src/blocksPage/blocks/signupEmail";
import type { BlocksInputs } from "../../src/blocksPage";
import { buildComponentsPage } from "../../src/componentsPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

type Root = { figma: { root: { children: { type: string; name: string }[] } } };

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

function textSet(node: FakeNode): Set<string> {
  return new Set(
    collect(node, (n) => n.type === "TEXT").map((n) => n.characters ?? ""),
  );
}

// Reused Label instances carry the source component's name ("Label"); one per
// field. Reused Input instances carry the resting variant's name. Reused Button
// instances carry a "Variant=…" name. (See the file header for why the inner
// override text isn't observable here.)
const LABEL_NAME = "Label";
const INPUT_NAME = "State=default, Leading=none";
const isButton = (n: FakeNode) =>
  n.type === "INSTANCE" && n.name.startsWith("Variant=");

type AuthSpec = {
  id: string;
  name: string;
  build: (page: PageNode, inputs: BlocksInputs) => Promise<number>;
  // Exact, standalone text nodes the block draws directly.
  exactTexts: string[];
  // The number of label-over-input fields (and their registry order, kept for
  // documentation — only the count is observable through the fake's instances).
  fields: string[];
  // Total reused Button instances (primary submit + social buttons).
  buttons: number;
  // When the social providers are icon-only buttons (sr-only labels), the
  // block groups them in a "Socials" row of this many children.
  socialRowCount?: number;
};

const SPECS: AuthSpec[] = [
  {
    id: "login-01",
    name: "Login",
    build: addLoginBlock,
    exactTexts: [
      "Login to your account",
      "Enter your email below to login to your account",
      "Forgot your password?",
      "Don't have an account? Sign up",
    ],
    fields: ["Email", "Password"],
    buttons: 2,
  },
  {
    id: "login-02",
    name: "Login (Two Column)",
    build: addLoginTwoColumnBlock,
    exactTexts: [
      "Login to your account",
      "Enter your email below to login to your account",
      "Forgot your password?",
      "Or continue with",
      "Don't have an account? Sign up",
    ],
    fields: ["Email", "Password"],
    buttons: 2,
  },
  {
    id: "login-03",
    name: "Login (Social)",
    build: addLoginSocialBlock,
    exactTexts: [
      "Welcome back",
      "Login with your Apple or Google account",
      "Or continue with",
      "Forgot your password?",
      "Don't have an account? Sign up",
      "By clicking continue, you agree to our Terms of Service and Privacy Policy.",
    ],
    fields: ["Email", "Password"],
    buttons: 3,
  },
  {
    id: "login-04",
    name: "Login (Card)",
    build: addLoginCardBlock,
    exactTexts: [
      "Welcome back",
      "Login to your Acme Inc account",
      "Forgot your password?",
      "Or continue with",
      "Don't have an account? Sign up",
      "By clicking continue, you agree to our Terms of Service and Privacy Policy.",
    ],
    fields: ["Email", "Password"],
    buttons: 4,
    socialRowCount: 3,
  },
  {
    id: "login-05",
    name: "Login (Email)",
    build: addLoginEmailBlock,
    exactTexts: [
      "Welcome to Acme Inc.",
      "Don't have an account? Sign up",
      "Or",
      "By clicking continue, you agree to our Terms of Service and Privacy Policy.",
    ],
    fields: ["Email"],
    buttons: 3,
  },
  {
    id: "signup-01",
    name: "Signup",
    build: addSignupBlock,
    exactTexts: [
      "Create an account",
      "Enter your information below to create your account",
      "We'll use this to contact you. We will not share your email with anyone else.",
      "Must be at least 8 characters long.",
      "Please confirm your password.",
      "Already have an account? Sign in",
    ],
    fields: ["Full Name", "Email", "Password", "Confirm Password"],
    buttons: 2,
  },
  {
    id: "signup-02",
    name: "Signup (Two Column)",
    build: addSignupTwoColumnBlock,
    exactTexts: [
      "Create your account",
      "Fill in the form below to create your account",
      "We'll use this to contact you. We will not share your email with anyone else.",
      "Must be at least 8 characters long.",
      "Please confirm your password.",
      "Or continue with",
      "Already have an account? Sign in",
    ],
    fields: ["Full Name", "Email", "Password", "Confirm Password"],
    buttons: 2,
  },
  {
    id: "signup-03",
    name: "Signup (Card)",
    build: addSignupSocialBlock,
    exactTexts: [
      "Create your account",
      "Enter your email below to create your account",
      "Must be at least 8 characters long.",
      "Already have an account? Sign in",
      "By clicking continue, you agree to our Terms of Service and Privacy Policy.",
    ],
    fields: ["Full Name", "Email", "Password", "Confirm Password"],
    buttons: 1,
  },
  {
    id: "signup-04",
    name: "Signup (Split)",
    build: addSignupCardBlock,
    exactTexts: [
      "Create your account",
      "Enter your email below to create your account",
      "We'll use this to contact you. We will not share your email with anyone else.",
      "Must be at least 8 characters long.",
      "Or continue with",
      "Already have an account? Sign in",
      "By clicking continue, you agree to our Terms of Service and Privacy Policy.",
    ],
    fields: ["Email", "Password", "Confirm Password"],
    buttons: 4,
    socialRowCount: 3,
  },
  {
    id: "signup-05",
    name: "Signup (Email)",
    build: addSignupEmailBlock,
    exactTexts: [
      "Welcome to Acme Inc.",
      "Already have an account? Sign in",
      "Or",
      "By clicking continue, you agree to our Terms of Service and Privacy Policy.",
    ],
    fields: ["Email"],
    buttons: 3,
  },
];

describe("auth block fidelity", () => {
  for (const spec of SPECS) {
    describe(`${spec.id} (${spec.name})`, () => {
      it("renders the exact registry copy, field count, and reused instances", async () => {
        const inputs = await makeInputsOnComponentsPage();
        const page = inputs.targetPage as unknown as { children: FakeNode[] };

        const count = await spec.build(inputs.targetPage, inputs);
        expect(count).toBeGreaterThan(0);

        const block = page.children[page.children.length - 1]!;
        expect(block.name).toBe(spec.name);

        // Exact registry copy: each must be its own standalone drawn text node.
        const texts = textSet(block);
        for (const expected of spec.exactTexts) {
          expect(texts.has(expected), `${spec.id} missing "${expected}"`).toBe(
            true,
          );
        }

        // One reused Label + one reused Input per field.
        const labels = collect(
          block,
          (n) => n.type === "INSTANCE" && n.name === LABEL_NAME,
        );
        const fieldInputs = collect(
          block,
          (n) => n.type === "INSTANCE" && n.name === INPUT_NAME,
        );
        expect(labels.length, `${spec.id} field labels`).toBe(
          spec.fields.length,
        );
        expect(fieldInputs.length, `${spec.id} field inputs`).toBe(
          spec.fields.length,
        );

        // The expected number of reused Button instances (submit + socials).
        const buttons = collect(block, isButton);
        expect(buttons.length, `${spec.id} buttons`).toBe(spec.buttons);

        // Icon-only social grids group their buttons in a "Socials" row.
        if (spec.socialRowCount !== undefined) {
          const row = collect(block, (n) => n.name === "Socials")[0];
          expect(row, `${spec.id} has no Socials row`).toBeDefined();
          expect((row!.children ?? []).length).toBe(spec.socialRowCount);
        }
      });
    });
  }
});
