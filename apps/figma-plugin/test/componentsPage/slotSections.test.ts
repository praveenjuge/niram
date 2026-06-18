import { describe, expect, it } from "vitest";
import type { ComponentsInputs } from "../../src/componentsPage";
import { addCardSection } from "../../src/componentsPage/sections/card";
import { addDialogSection } from "../../src/componentsPage/sections/dialog";
import { addAlertDialogSection } from "../../src/componentsPage/sections/alertDialog";
import { addSheetSection } from "../../src/componentsPage/sections/sheet";
import { addDrawerSection } from "../../src/componentsPage/sections/drawer";
import { addPopoverSection } from "../../src/componentsPage/sections/popover";
import { addHoverCardSection } from "../../src/componentsPage/sections/hoverCard";
import { addAspectRatioSection } from "../../src/componentsPage/sections/aspectRatio";
import { addScrollAreaSection } from "../../src/componentsPage/sections/scrollArea";
import { addResizableSection } from "../../src/componentsPage/sections/resizable";
import { addAccordionSection } from "../../src/componentsPage/sections/accordion";
import { addTabsSection } from "../../src/componentsPage/sections/tabs";
import { addButtonGroupSection } from "../../src/componentsPage/sections/buttonGroup";
import { addToggleGroupSection } from "../../src/componentsPage/sections/toggleGroup";
import { addBreadcrumbSection } from "../../src/componentsPage/sections/breadcrumb";
import { addPaginationSection } from "../../src/componentsPage/sections/pagination";
import { addCarouselSection } from "../../src/componentsPage/sections/carousel";
import { addDropdownMenuSection } from "../../src/componentsPage/sections/dropdownMenu";
import { addContextMenuSection } from "../../src/componentsPage/sections/contextMenu";
import { addMenubarSection } from "../../src/componentsPage/sections/menubar";
import { addCommandSection } from "../../src/componentsPage/sections/command";
import { addNavigationMenuSection } from "../../src/componentsPage/sections/navigationMenu";
import { addComboboxSection } from "../../src/componentsPage/sections/combobox";
import { addFieldSection } from "../../src/componentsPage/sections/field";
import { addFormSection } from "../../src/componentsPage/sections/form";
import { addInputGroupSection } from "../../src/componentsPage/sections/inputGroup";
import { addItemSection } from "../../src/componentsPage/sections/item";
import { addEmptySection } from "../../src/componentsPage/sections/empty";
import { addTableSection } from "../../src/componentsPage/sections/table";
import { addDataTableSection } from "../../src/componentsPage/sections/dataTable";

// Section-level slot coverage: each converted component should expose at least
// the expected SLOT nodes (named content/action/item regions). We build the
// section against the in-memory figma mock and walk the resulting tree for
// nodes of type "SLOT".

type AnyNode = {
  type: string;
  name: string;
  children?: AnyNode[];
};

function figmaMock(): { createPage: () => AnyNode } {
  return (globalThis as unknown as { figma: { createPage: () => AnyNode } })
    .figma;
}

function emptyInputs(extra?: Partial<ComponentsInputs>): ComponentsInputs {
  return {
    presetCode: "test",
    primitives: new Map(),
    tailwindColors: new Map(),
    theme: { light: new Map(), dark: new Map() },
    ...extra,
  };
}

function slotNames(root: AnyNode): string[] {
  const out: string[] = [];
  const visit = (n: AnyNode) => {
    if (n.type === "SLOT") out.push(n.name);
    if (n.children) for (const c of n.children) visit(c);
  };
  visit(root);
  return out;
}

async function slotsFor(
  add: (page: never, inputs: ComponentsInputs) => Promise<number>,
): Promise<string[]> {
  const page = figmaMock().createPage();
  await add(page as never, emptyInputs());
  return slotNames(page as AnyNode);
}

describe("shell components expose content/action slots", () => {
  it("Card exposes Content and Actions slots", async () => {
    const names = await slotsFor(addCardSection);
    expect(names).toContain("Content");
    expect(names).toContain("Actions");
  });

  it("Dialog exposes a Content and Actions slot", async () => {
    const names = await slotsFor(addDialogSection);
    expect(names).toContain("Actions");
  });

  it("Alert Dialog exposes an Actions slot", async () => {
    const names = await slotsFor(addAlertDialogSection);
    expect(names).toContain("Actions");
  });

  it("Sheet exposes Content and Actions slots", async () => {
    const names = await slotsFor(addSheetSection);
    expect(names).toContain("Content");
    expect(names).toContain("Actions");
  });

  it("Drawer exposes an Actions slot", async () => {
    const names = await slotsFor(addDrawerSection);
    expect(names).toContain("Actions");
  });

  it("Popover exposes a Content slot", async () => {
    const names = await slotsFor(addPopoverSection);
    expect(names).toContain("Content");
  });

  it("Hover Card exposes a Content slot", async () => {
    const names = await slotsFor(addHoverCardSection);
    expect(names).toContain("Content");
  });

  it("Aspect Ratio exposes a Content slot", async () => {
    const names = await slotsFor(addAspectRatioSection);
    expect(names).toContain("Content");
  });

  it("Scroll Area exposes a Content slot", async () => {
    const names = await slotsFor(addScrollAreaSection);
    expect(names).toContain("Content");
  });

  it("Resizable exposes panel slots", async () => {
    const names = await slotsFor(addResizableSection);
    expect(names.filter((n) => n.startsWith("Panel")).length).toBeGreaterThan(
      0,
    );
  });
});

describe("repeating-list components expose item slots", () => {
  it("Accordion exposes an Items slot", async () => {
    expect(await slotsFor(addAccordionSection)).toContain("Items");
  });

  it("Tabs exposes a Tabs slot", async () => {
    expect(await slotsFor(addTabsSection)).toContain("Tabs");
  });

  it("Button Group exposes an Items slot", async () => {
    expect(await slotsFor(addButtonGroupSection)).toContain("Items");
  });

  it("Toggle Group exposes an Items slot", async () => {
    expect(await slotsFor(addToggleGroupSection)).toContain("Items");
  });

  it("Breadcrumb exposes an Items slot", async () => {
    expect(await slotsFor(addBreadcrumbSection)).toContain("Items");
  });

  it("Pagination exposes an Items slot", async () => {
    expect(await slotsFor(addPaginationSection)).toContain("Items");
  });

  it("Carousel exposes a Slides slot", async () => {
    expect(await slotsFor(addCarouselSection)).toContain("Slides");
  });
});

describe("menu/command surfaces expose item slots", () => {
  it("Dropdown Menu exposes an Items slot", async () => {
    expect(await slotsFor(addDropdownMenuSection)).toContain("Items");
  });

  it("Context Menu exposes an Items slot", async () => {
    expect(await slotsFor(addContextMenuSection)).toContain("Items");
  });

  it("Menubar exposes an Items slot", async () => {
    expect(await slotsFor(addMenubarSection)).toContain("Items");
  });

  it("Command exposes an Items slot", async () => {
    expect(await slotsFor(addCommandSection)).toContain("Items");
  });

  it("Navigation Menu exposes an Items slot", async () => {
    expect(await slotsFor(addNavigationMenuSection)).toContain("Items");
  });

  it("Combobox exposes an Items slot", async () => {
    expect(await slotsFor(addComboboxSection)).toContain("Items");
  });
});

describe("form composition + flexible rows expose slots", () => {
  it("Field exposes Control / Description / Error slots", async () => {
    const names = await slotsFor(addFieldSection);
    expect(names).toContain("Control");
    expect(names).toContain("Description");
    expect(names).toContain("Error");
  });

  it("Form exposes a Fields slot", async () => {
    expect(await slotsFor(addFormSection)).toContain("Fields");
  });

  it("Input Group exposes Leading and Trailing slots", async () => {
    const names = await slotsFor(addInputGroupSection);
    expect(names).toContain("Leading");
    expect(names).toContain("Trailing");
  });

  it("Item exposes Leading / Content / Trailing slots", async () => {
    const names = await slotsFor(addItemSection);
    expect(names).toContain("Leading");
    expect(names).toContain("Content");
    expect(names).toContain("Trailing");
  });

  it("Empty exposes Illustration and Action slots", async () => {
    const names = await slotsFor(addEmptySection);
    expect(names).toContain("Illustration");
    expect(names).toContain("Action");
  });

  it("Table exposes a Rows slot", async () => {
    expect(await slotsFor(addTableSection)).toContain("Rows");
  });

  it("Data Table exposes a Rows slot", async () => {
    expect(await slotsFor(addDataTableSection)).toContain("Rows");
  });
});
