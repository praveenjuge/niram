// Builds the 16 Sidebar rails (sidebar-01 … sidebar-16) as ComponentNodes.
//
// Each builder mirrors the corresponding shadcn block's AppSidebar composition
// (apps/v4/registry/new-york-v4/blocks/sidebar-NN) styled to radix-nova. They
// are combined into a single "Sidebar" component set by index.ts, so a designer
// picks a layout from the Figma variant switcher. Every rail is the requested
// fixed 982px tall.

import {
  CALENDARS,
  CHANGES,
  DOCS_NAV,
  DOCS_VERSIONS,
  FAVORITES,
  FILE_TREE,
  MAILS,
  MAIL_NAV,
  NAV_MAIN_NOTION,
  NAV_SECONDARY,
  NOTION_SECONDARY,
  PLATFORM_NAV,
  PROJECTS,
  SETTINGS_NAV,
  USER,
  WORKSPACES,
} from "./data";
import {
  appendFill,
  createContent,
  createFooter,
  createGroup,
  createGroupLabel,
  createHeader,
  createMenu,
  createMenuButton,
  createMenuSub,
  createMenuSubButton,
  createSearchField,
  createSeparator,
  createSidebarShell,
  fillHeight,
  iconCandidates,
} from "./primitives";
import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../../../componentsPage/bindings";
import { applyFont } from "../../../fonts";
import { createNamedIcon, resolveIconLibrary } from "../../../icons";
import type { BlocksInputs } from "../../types";

export type SidebarVariant = {
  // The variant property value shown in Figma's switcher (e.g. "sidebar-01").
  key: string;
  build: (inputs: BlocksInputs) => ComponentNode;
};

// Helper: a docs-style group (label + flat menu of leaf links).
function docsGroup(inputs: BlocksInputs, group: (typeof DOCS_NAV)[number]) {
  const g = createGroup();
  appendFill(g, createGroupLabel(inputs, group.title));
  const menu = createMenu();
  for (const item of group.items) {
    appendFill(
      menu,
      createMenuButton(inputs, { label: item.title, active: item.active }),
    );
  }
  appendFill(g, menu);
  return g;
}

// sidebar-01: version switcher + search header, a SidebarGroup per docs section.
function buildSidebar01(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail");
  const header = createHeader();
  appendFill(
    header,
    createMenuButton(inputs, {
      label: "Documentation",
      subtitle: "v" + DOCS_VERSIONS[0],
      brand: true,
      icon: "gallery-vertical-end",
      size: "lg",
      trailingIcon: "chevrons-up-down",
    }),
  );
  appendFill(header, createSearchField(inputs));
  appendFill(comp, header);

  const content = createContent();
  for (const group of DOCS_NAV) appendFill(content, docsGroup(inputs, group));
  appendFill(comp, content);
  fillHeight(content);
  return comp;
}

// sidebar-02: version switcher + search, collapsible groups (chevron labels).
function buildSidebar02(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail");
  const header = createHeader();
  appendFill(
    header,
    createMenuButton(inputs, {
      label: "Documentation",
      subtitle: "v" + DOCS_VERSIONS[0],
      brand: true,
      icon: "gallery-vertical-end",
      size: "lg",
      trailingIcon: "chevrons-up-down",
    }),
  );
  appendFill(header, createSearchField(inputs));
  appendFill(comp, header);

  const content = createContent();
  for (const group of DOCS_NAV) {
    const g = createGroup();
    // The group label doubles as the collapsible trigger (chevron at the right).
    const label = createMenuButton(inputs, {
      label: group.title,
      trailingIcon: "chevron-right",
    });
    label.name = "Group Label";
    appendFill(g, label);
    const menu = createMenu();
    for (const item of group.items) {
      appendFill(
        menu,
        createMenuButton(inputs, { label: item.title, active: item.active }),
      );
    }
    appendFill(g, menu);
    appendFill(content, g);
  }
  appendFill(comp, content);
  fillHeight(content);
  return comp;
}

// sidebar-03: brand header, a single group with menu + nested SidebarMenuSub.
function buildSidebar03(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail");
  const header = createHeader();
  appendFill(
    header,
    createMenuButton(inputs, {
      label: "Documentation",
      subtitle: "v1.0.0",
      brand: true,
      icon: "gallery-vertical-end",
      size: "lg",
    }),
  );
  appendFill(comp, header);

  const content = createContent();
  const g = createGroup();
  const menu = createMenu();
  for (const group of DOCS_NAV) {
    appendFill(menu, createMenuButton(inputs, { label: group.title }));
    const { wrapper, body } = createMenuSub(inputs);
    for (const item of group.items) {
      appendFill(
        body,
        createMenuSubButton(inputs, item.title, { active: item.active }),
      );
    }
    appendFill(menu, wrapper);
  }
  appendFill(g, menu);
  appendFill(content, g);
  appendFill(comp, content);
  fillHeight(content);
  return comp;
}

// sidebar-04: floating variant, brand header, menu + bordersless sub.
function buildSidebar04(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail", { variant: "floating" });
  const header = createHeader();
  appendFill(
    header,
    createMenuButton(inputs, {
      label: "Documentation",
      subtitle: "v1.0.0",
      brand: true,
      icon: "gallery-vertical-end",
      size: "lg",
    }),
  );
  appendFill(comp, header);

  const content = createContent();
  const g = createGroup();
  const menu = createMenu(8); // `gap-2`
  for (const group of DOCS_NAV) {
    appendFill(menu, createMenuButton(inputs, { label: group.title }));
    const { wrapper, body } = createMenuSub(inputs);
    for (const item of group.items) {
      appendFill(
        body,
        createMenuSubButton(inputs, item.title, { active: item.active }),
      );
    }
    appendFill(menu, wrapper);
  }
  appendFill(g, menu);
  appendFill(content, g);
  appendFill(comp, content);
  fillHeight(content);
  return comp;
}

// sidebar-05: brand + search header, collapsible menu with Plus/Minus toggles.
function buildSidebar05(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail");
  const header = createHeader();
  appendFill(
    header,
    createMenuButton(inputs, {
      label: "Documentation",
      subtitle: "v1.0.0",
      brand: true,
      icon: "gallery-vertical-end",
      size: "lg",
    }),
  );
  appendFill(header, createSearchField(inputs));
  appendFill(comp, header);

  const content = createContent();
  const g = createGroup();
  const menu = createMenu();
  DOCS_NAV.forEach((group, index) => {
    appendFill(
      menu,
      createMenuButton(inputs, {
        label: group.title,
        trailingIcon: index === 1 ? "minus" : "plus",
      }),
    );
    if (index === 1) {
      const { wrapper, body } = createMenuSub(inputs);
      for (const item of group.items) {
        appendFill(
          body,
          createMenuSubButton(inputs, item.title, { active: item.active }),
        );
      }
      appendFill(menu, wrapper);
    }
  });
  appendFill(g, menu);
  appendFill(content, g);
  appendFill(comp, content);
  fillHeight(content);
  return comp;
}

// sidebar-06: brand header, dropdown nav (MoreHorizontal), opt-in form footer.
function buildSidebar06(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail");
  const header = createHeader();
  appendFill(
    header,
    createMenuButton(inputs, {
      label: "Documentation",
      subtitle: "v1.0.0",
      brand: true,
      icon: "gallery-vertical-end",
      size: "lg",
    }),
  );
  appendFill(comp, header);

  const content = createContent();
  const g = createGroup();
  const menu = createMenu();
  for (const group of DOCS_NAV) {
    appendFill(
      menu,
      createMenuButton(inputs, {
        label: group.title,
        trailingIcon: "more-horizontal",
      }),
    );
  }
  appendFill(g, menu);
  appendFill(content, g);
  appendFill(comp, content);
  fillHeight(content);

  // Footer: a newsletter opt-in card.
  const footer = createFooter();
  appendFill(footer, buildOptInCard(inputs));
  appendFill(comp, footer);
  return comp;
}

// sidebar-07: team switcher, "Platform" collapsible nav + projects, user footer.
function buildSidebar07(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail");
  const header = createHeader();
  appendFill(
    header,
    createMenuButton(inputs, {
      label: "Acme Inc",
      subtitle: "Enterprise",
      brand: true,
      icon: "gallery-vertical-end",
      size: "lg",
      trailingIcon: "chevrons-up-down",
    }),
  );
  appendFill(comp, header);

  const content = createContent();
  appendFill(content, buildPlatformGroup(inputs));
  appendFill(content, buildProjectsGroup(inputs));
  appendFill(comp, content);
  fillHeight(content);

  const footer = createFooter();
  appendFill(footer, buildUserButton(inputs));
  appendFill(comp, footer);
  return comp;
}

// sidebar-08: inset variant, Platform nav + projects + secondary, user footer.
function buildSidebar08(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail", {
    variant: "inset",
    border: false,
  });
  const header = createHeader();
  appendFill(
    header,
    createMenuButton(inputs, {
      label: "Acme Inc",
      subtitle: "Enterprise",
      brand: true,
      icon: "command",
      size: "lg",
    }),
  );
  appendFill(comp, header);

  const content = createContent();
  appendFill(content, buildPlatformGroup(inputs));
  appendFill(content, buildProjectsGroup(inputs));
  const secondary = createGroup();
  const secMenu = createMenu();
  for (const item of NAV_SECONDARY) {
    appendFill(
      secMenu,
      createMenuButton(inputs, {
        label: item.title,
        icon: item.icon,
        size: "sm",
      }),
    );
  }
  appendFill(secondary, secMenu);
  appendFill(content, secondary);
  appendFill(comp, content);
  fillHeight(content);

  const footer = createFooter();
  appendFill(footer, buildUserButton(inputs));
  appendFill(comp, footer);
  return comp;
}

// sidebar-09: dual-pane mail rail — a narrow icon rail + a wide mail list.
function buildSidebar09(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail", { width: 304, border: true });
  comp.layoutMode = "HORIZONTAL";
  comp.itemSpacing = 0;

  // Narrow icon rail (`--sidebar-width-icon + 1px`).
  const iconRail = figma.createFrame();
  iconRail.name = "Icon Rail";
  iconRail.layoutMode = "VERTICAL";
  iconRail.primaryAxisSizingMode = "FIXED";
  iconRail.counterAxisSizingMode = "FIXED";
  iconRail.resize(49, 982);
  iconRail.itemSpacing = 0;
  iconRail.fills = [];
  iconRail.strokes = [];
  bindBorderRight(inputs, iconRail);

  const iconHeader = createHeader();
  iconHeader.paddingLeft = 8;
  iconHeader.paddingRight = 8;
  const brand = figma.createFrame();
  brand.name = "Logo";
  brand.layoutMode = "HORIZONTAL";
  brand.primaryAxisAlignItems = "CENTER";
  brand.counterAxisAlignItems = "CENTER";
  brand.primaryAxisSizingMode = "FIXED";
  brand.counterAxisSizingMode = "FIXED";
  brand.resize(32, 32);
  brand.cornerRadius = 8;
  brand.strokes = [];
  bindSidebarPrimary(inputs, brand);
  const cmd = iconOnly(inputs, "command", 16, true);
  if (cmd) brand.appendChild(cmd);
  iconHeader.appendChild(brand);
  appendFill(iconRail, iconHeader);

  const iconContent = createContent();
  const iconMenu = createMenu();
  iconMenu.paddingLeft = 8;
  iconMenu.paddingRight = 8;
  for (const item of MAIL_NAV) {
    const cell = figma.createFrame();
    cell.name = item.active ? "Item (active)" : "Item";
    cell.layoutMode = "HORIZONTAL";
    cell.primaryAxisAlignItems = "CENTER";
    cell.counterAxisAlignItems = "CENTER";
    cell.primaryAxisSizingMode = "FIXED";
    cell.counterAxisSizingMode = "FIXED";
    cell.resize(32, 32);
    cell.cornerRadius = 6;
    cell.strokes = [];
    if (item.active) bindSidebarAccent(inputs, cell);
    else cell.fills = [];
    const g = iconOnly(inputs, item.icon, 16, false, item.active);
    if (g) cell.appendChild(g);
    iconMenu.appendChild(cell);
  }
  appendFill(iconContent, iconMenu);
  appendFill(iconRail, iconContent);
  fillHeight(iconContent);
  comp.appendChild(iconRail);

  // Wide mail list.
  const list = figma.createFrame();
  list.name = "Mail List";
  list.layoutMode = "VERTICAL";
  list.primaryAxisSizingMode = "FIXED";
  list.counterAxisSizingMode = "FIXED";
  list.resize(255, 982);
  list.itemSpacing = 0;
  list.fills = [];
  list.strokes = [];
  comp.appendChild(list);
  list.layoutGrow = 1;
  fillHeight(list);

  const listHeader = createHeader();
  listHeader.paddingLeft = 16;
  listHeader.paddingRight = 16;
  listHeader.paddingTop = 16;
  listHeader.paddingBottom = 16;
  listHeader.itemSpacing = 14;
  bindBorderBottom(inputs, listHeader);
  const titleRow = figma.createFrame();
  titleRow.name = "Title Row";
  titleRow.layoutMode = "HORIZONTAL";
  titleRow.primaryAxisSizingMode = "FIXED";
  titleRow.counterAxisSizingMode = "AUTO";
  titleRow.counterAxisAlignItems = "CENTER";
  titleRow.primaryAxisAlignItems = "SPACE_BETWEEN";
  titleRow.fills = [];
  titleRow.strokes = [];
  appendText(inputs, titleRow, "Inbox", 16, "foreground", "Medium");
  appendText(inputs, titleRow, "Unreads", 14, "muted-foreground", "Regular");
  appendFill(listHeader, titleRow);
  appendFill(listHeader, createSearchField(inputs, "Type to search..."));
  appendFill(list, listHeader);

  const listContent = createContent();
  for (const mail of MAILS) {
    appendFill(listContent, buildMailRow(inputs, mail));
  }
  appendFill(list, listContent);
  fillHeight(listContent);
  return comp;
}

// sidebar-10: Notion-style — team switcher + main nav header, favorites +
// workspaces + secondary content.
function buildSidebar10(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail", { border: false });
  const header = createHeader();
  appendFill(
    header,
    createMenuButton(inputs, {
      label: "Acme Inc",
      smallBrand: true,
      icon: "command",
      trailingIcon: "chevron-down",
    }),
  );
  const mainMenu = createMenu();
  for (const item of NAV_MAIN_NOTION) {
    appendFill(
      mainMenu,
      createMenuButton(inputs, {
        label: item.title,
        icon: item.icon,
        active: item.active,
        badge: item.badge,
      }),
    );
  }
  appendFill(header, mainMenu);
  appendFill(comp, header);

  const content = createContent();
  appendFill(content, buildEmojiGroup(inputs, "Favorites", FAVORITES));
  appendFill(content, buildWorkspacesGroup(inputs));
  const secondary = createGroup();
  const secMenu = createMenu();
  for (const item of NOTION_SECONDARY) {
    appendFill(
      secMenu,
      createMenuButton(inputs, { label: item.title, icon: item.icon }),
    );
  }
  appendFill(secondary, secMenu);
  appendFill(content, secondary);
  appendFill(comp, content);
  fillHeight(content);
  return comp;
}

// sidebar-11: file explorer — Changes group (badges) + Files tree.
function buildSidebar11(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail");
  const content = createContent();

  const changes = createGroup();
  appendFill(changes, createGroupLabel(inputs, "Changes"));
  const changesMenu = createMenu();
  for (const change of CHANGES) {
    appendFill(
      changesMenu,
      createMenuButton(inputs, {
        label: change.file,
        icon: "file",
        badge: change.state,
      }),
    );
  }
  appendFill(changes, changesMenu);
  appendFill(content, changes);

  const files = createGroup();
  appendFill(files, createGroupLabel(inputs, "Files"));
  const filesMenu = createMenu();
  for (const node of FILE_TREE) {
    const row = createMenuButton(inputs, {
      label: node.name,
      icon: node.folder ? "folder" : "file",
      active: node.active,
    });
    // Indent nested tree rows (`SidebarMenuSub` mx + the tree's own nesting).
    row.paddingLeft = 8 + node.depth * 16;
    appendFill(filesMenu, row);
  }
  appendFill(files, filesMenu);
  appendFill(content, files);

  appendFill(comp, content);
  fillHeight(content);
  return comp;
}

// sidebar-12: calendar rail — user header, date picker grid, calendar groups.
function buildSidebar12(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail");
  const header = createHeader();
  header.paddingTop = 0;
  header.paddingBottom = 0;
  header.primaryAxisSizingMode = "FIXED";
  header.counterAxisSizingMode = "FIXED";
  header.resize(256, 64);
  header.primaryAxisAlignItems = "CENTER";
  bindBorderBottom(inputs, header);
  appendFill(header, buildUserButton(inputs));
  appendFill(comp, header);

  const content = createContent();
  appendFill(content, buildMiniCalendar(inputs));
  appendFill(content, createSeparator(inputs));
  CALENDARS.forEach((cal, index) => {
    const g = createGroup();
    g.paddingTop = 0;
    g.paddingBottom = 0;
    const label = createMenuButton(inputs, {
      label: cal.name,
      trailingIcon: "chevron-right",
    });
    label.name = "Group Label";
    appendFill(g, label);
    if (index === 0) {
      const menu = createMenu();
      cal.items.forEach((item, i) => {
        appendFill(
          menu,
          createMenuButton(inputs, {
            label: item,
            icon: i < 2 ? "check" : undefined,
          }),
        );
      });
      appendFill(g, menu);
    }
    appendFill(content, g);
    appendFill(content, createSeparator(inputs));
  });
  appendFill(comp, content);
  fillHeight(content);

  const footer = createFooter();
  appendFill(
    footer,
    createMenuButton(inputs, { label: "New Calendar", icon: "plus" }),
  );
  appendFill(comp, footer);
  return comp;
}

// sidebar-13: the settings dialog nav (a `collapsible="none"` rail with one
// flat icon menu).
function buildSidebar13(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail", { border: true });
  const content = createContent();
  const g = createGroup();
  const menu = createMenu();
  for (const item of SETTINGS_NAV) {
    appendFill(
      menu,
      createMenuButton(inputs, {
        label: item.title,
        icon: item.icon,
        active: item.active,
      }),
    );
  }
  appendFill(g, menu);
  appendFill(content, g);
  appendFill(comp, content);
  fillHeight(content);
  return comp;
}

// sidebar-14: a right-side rail (border-l) with a Table of Contents tree.
function buildSidebar14(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail", { side: "right" });
  const content = createContent();
  const g = createGroup();
  appendFill(g, createGroupLabel(inputs, "Table of Contents"));
  const menu = createMenu();
  for (const group of DOCS_NAV) {
    appendFill(menu, createMenuButton(inputs, { label: group.title }));
    const { wrapper, body } = createMenuSub(inputs);
    for (const item of group.items) {
      appendFill(
        body,
        createMenuSubButton(inputs, item.title, { active: item.active }),
      );
    }
    appendFill(menu, wrapper);
  }
  appendFill(g, menu);
  appendFill(content, g);
  appendFill(comp, content);
  fillHeight(content);
  return comp;
}

// sidebar-15: the Notion left rail (same as sidebar-10) — the canonical
// left-hand member of sidebar-15's dual-sidebar page.
function buildSidebar15(inputs: BlocksInputs): ComponentNode {
  const comp = buildSidebar10(inputs);
  return comp;
}

// sidebar-16: a header-anchored rail (top border) with Platform nav + projects
// + secondary, user footer (the sidebar-with-header layout).
function buildSidebar16(inputs: BlocksInputs): ComponentNode {
  const comp = createSidebarShell(inputs, "rail");
  bindBorderTop(inputs, comp);
  const header = createHeader();
  appendFill(
    header,
    createMenuButton(inputs, {
      label: "Acme Inc",
      subtitle: "Enterprise",
      brand: true,
      icon: "command",
      size: "lg",
    }),
  );
  appendFill(comp, header);

  const content = createContent();
  appendFill(content, buildPlatformGroup(inputs));
  appendFill(content, buildProjectsGroup(inputs));
  const secondary = createGroup();
  const secMenu = createMenu();
  for (const item of NAV_SECONDARY) {
    appendFill(
      secMenu,
      createMenuButton(inputs, {
        label: item.title,
        icon: item.icon,
        size: "sm",
      }),
    );
  }
  appendFill(secondary, secMenu);
  appendFill(content, secondary);
  appendFill(comp, content);
  fillHeight(content);

  const footer = createFooter();
  appendFill(footer, buildUserButton(inputs));
  appendFill(comp, footer);
  return comp;
}

// ----- Shared sub-builders -------------------------------------------------

function buildPlatformGroup(inputs: BlocksInputs): FrameNode {
  const g = createGroup();
  appendFill(g, createGroupLabel(inputs, "Platform"));
  const menu = createMenu();
  for (const item of PLATFORM_NAV) {
    appendFill(
      menu,
      createMenuButton(inputs, {
        label: item.title,
        icon: item.icon,
        trailingIcon: "chevron-right",
      }),
    );
    if (item.active) {
      const { wrapper, body } = createMenuSub(inputs);
      for (const sub of item.items) {
        appendFill(body, createMenuSubButton(inputs, sub));
      }
      appendFill(menu, wrapper);
    }
  }
  appendFill(g, menu);
  return g;
}

function buildProjectsGroup(inputs: BlocksInputs): FrameNode {
  const g = createGroup();
  appendFill(g, createGroupLabel(inputs, "Projects"));
  const menu = createMenu();
  for (const project of PROJECTS) {
    appendFill(
      menu,
      createMenuButton(inputs, {
        label: project.name,
        icon: project.icon,
        trailingIcon: "more-horizontal",
      }),
    );
  }
  appendFill(
    menu,
    createMenuButton(inputs, {
      label: "More",
      icon: "more-horizontal",
      muted: true,
    }),
  );
  appendFill(g, menu);
  return g;
}

function buildEmojiGroup(
  inputs: BlocksInputs,
  label: string,
  items: string[],
): FrameNode {
  const g = createGroup();
  appendFill(g, createGroupLabel(inputs, label));
  const menu = createMenu();
  for (const name of items) {
    appendFill(
      menu,
      createMenuButton(inputs, {
        label: name,
        icon: "file-text",
        trailingIcon: "more-horizontal",
      }),
    );
  }
  appendFill(
    menu,
    createMenuButton(inputs, {
      label: "More",
      icon: "more-horizontal",
      muted: true,
    }),
  );
  appendFill(g, menu);
  return g;
}

function buildWorkspacesGroup(inputs: BlocksInputs): FrameNode {
  const g = createGroup();
  appendFill(g, createGroupLabel(inputs, "Workspaces"));
  const menu = createMenu();
  for (const name of WORKSPACES) {
    appendFill(
      menu,
      createMenuButton(inputs, {
        label: name,
        icon: "folder",
        trailingIcon: "chevron-right",
      }),
    );
  }
  appendFill(
    menu,
    createMenuButton(inputs, {
      label: "More",
      icon: "more-horizontal",
      muted: true,
    }),
  );
  appendFill(g, menu);
  return g;
}

function buildUserButton(inputs: BlocksInputs): FrameNode {
  return createMenuButton(inputs, {
    label: USER.name,
    subtitle: USER.email,
    avatar: true,
    size: "lg",
    trailingIcon: "chevrons-up-down",
  });
}

// sidebar-06 newsletter opt-in card.
function buildOptInCard(inputs: BlocksInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const card = figma.createFrame();
  card.name = "Opt-in";
  card.layoutMode = "VERTICAL";
  card.primaryAxisSizingMode = "AUTO";
  card.counterAxisSizingMode = "FIXED";
  card.itemSpacing = 10;
  card.paddingLeft = 16;
  card.paddingRight = 16;
  card.paddingTop = 16;
  card.paddingBottom = 16;
  card.cornerRadius = 12;
  bindCorner(inputs, card, "radius/xl");
  bindCardFill(inputs, card);
  card.strokes = [];

  appendText(
    inputs,
    card,
    "Subscribe to our newsletter",
    14,
    "card-foreground",
    "Medium",
  );
  appendText(
    inputs,
    card,
    "Opt-in to receive updates and news about the sidebar.",
    12,
    "muted-foreground",
    "Regular",
  );

  const input = createSearchField(inputs, "Email");
  // The opt-in field has no search glyph; relabel as a plain input.
  input.name = "Email";
  appendFill(card, input);

  const button = figma.createFrame();
  button.name = "Subscribe";
  button.layoutMode = "HORIZONTAL";
  button.primaryAxisSizingMode = "FIXED";
  button.counterAxisSizingMode = "FIXED";
  button.primaryAxisAlignItems = "CENTER";
  button.counterAxisAlignItems = "CENTER";
  button.resize(10, 32);
  button.cornerRadius = 8;
  bindCorner(inputs, button, "radius/lg");
  bindSidebarPrimary(inputs, button);
  button.strokes = [];
  const label = figma.createText();
  applyFontText(inputs, label, "Subscribe", 14, undefined, "Medium");
  bindFillKey(
    inputs,
    label,
    "sidebar-primary-foreground",
    "primary-foreground",
  );
  button.appendChild(label);
  appendFill(card, button);

  return card;
}

// sidebar-12 mini month grid (`grid-cols-7`).
function buildMiniCalendar(inputs: BlocksInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const wrap = createGroup();
  wrap.paddingTop = 0;
  wrap.paddingBottom = 0;
  appendText(inputs, wrap, "October 2024", 14, "foreground", "Medium");

  const grid = figma.createFrame();
  grid.name = "Days";
  grid.layoutMode = "HORIZONTAL";
  grid.layoutWrap = "WRAP";
  grid.primaryAxisSizingMode = "FIXED";
  grid.counterAxisSizingMode = "AUTO";
  grid.itemSpacing = 0;
  grid.counterAxisSpacing = 0;
  grid.resize(224, 10);
  grid.fills = [];
  grid.strokes = [];
  for (let day = 1; day <= 35; day++) {
    const cell = figma.createFrame();
    cell.name = "Day";
    cell.layoutMode = "HORIZONTAL";
    cell.primaryAxisAlignItems = "CENTER";
    cell.counterAxisAlignItems = "CENTER";
    cell.primaryAxisSizingMode = "FIXED";
    cell.counterAxisSizingMode = "FIXED";
    cell.resize(32, 32);
    cell.cornerRadius = 6;
    cell.strokes = [];
    const active = day === 17;
    if (active) bindSidebarPrimary(inputs, cell);
    else cell.fills = [];
    const label = figma.createText();
    const value = day <= 31 ? String(day) : "";
    applyFontText(
      inputs,
      label,
      value,
      12,
      active ? "sidebar-primary-foreground" : "foreground",
      "Regular",
    );
    if (active)
      bindFillKey(
        inputs,
        label,
        "sidebar-primary-foreground",
        "primary-foreground",
      );
    cell.appendChild(label);
    grid.appendChild(cell);
  }
  appendFill(wrap, grid);
  return wrap;
}

// sidebar-09 mail list row.
function buildMailRow(
  inputs: BlocksInputs,
  mail: { name: string; date: string; subject: string },
): FrameNode {
  const row = figma.createFrame();
  row.name = "Mail";
  row.layoutMode = "VERTICAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "FIXED";
  row.itemSpacing = 8;
  row.paddingLeft = 16;
  row.paddingRight = 16;
  row.paddingTop = 16;
  row.paddingBottom = 16;
  row.fills = [];
  row.strokes = [];
  bindBorderBottom(inputs, row);

  const top = figma.createFrame();
  top.name = "Top";
  top.layoutMode = "HORIZONTAL";
  top.primaryAxisSizingMode = "FIXED";
  top.counterAxisSizingMode = "AUTO";
  top.counterAxisAlignItems = "CENTER";
  top.primaryAxisAlignItems = "SPACE_BETWEEN";
  top.fills = [];
  top.strokes = [];
  appendText(inputs, top, mail.name, 14, "foreground", "Regular");
  appendText(inputs, top, mail.date, 12, "muted-foreground", "Regular");
  appendFill(row, top);

  appendText(inputs, row, mail.subject, 14, "foreground", "Medium");
  appendText(
    inputs,
    row,
    "Hi team, just a reminder about our meeting…",
    12,
    "muted-foreground",
    "Regular",
  );
  return row;
}

// ----- Tiny binding/text helpers (avoid importing the whole bindings set) ---

function sb(t: Map<string, Variable>, key: string, fallback: string) {
  return t.get(key) ?? t.get(fallback);
}

function bindCardFill(inputs: BlocksInputs, node: FrameNode) {
  bindFill(node, inputs.theme.light.get("card"));
}
function bindSidebarPrimary(inputs: BlocksInputs, node: FrameNode) {
  bindFill(node, sb(inputs.theme.light, "sidebar-primary", "primary"));
}
function bindSidebarAccent(inputs: BlocksInputs, node: FrameNode) {
  bindFill(node, sb(inputs.theme.light, "sidebar-accent", "accent"));
}
function bindCorner(inputs: BlocksInputs, node: FrameNode, key: string) {
  bindCornerRadii(node, inputs.primitives.get(key));
}
function bindFillKey(
  inputs: BlocksInputs,
  node: TextNode,
  key: string,
  fallback: string,
) {
  bindFill(node, sb(inputs.theme.light, key, fallback));
}

function bindBorderBottom(inputs: BlocksInputs, node: FrameNode) {
  bindStrokeColor(node, sb(inputs.theme.light, "sidebar-border", "border"));
  node.strokeWeight = 1;
  node.strokeAlign = "INSIDE";
  node.strokeTopWeight = 0;
  node.strokeLeftWeight = 0;
  node.strokeRightWeight = 0;
  node.strokeBottomWeight = 1;
}
function bindBorderTop(inputs: BlocksInputs, node: FrameNode | ComponentNode) {
  bindStrokeColor(node, sb(inputs.theme.light, "sidebar-border", "border"));
  node.strokeWeight = 1;
  node.strokeAlign = "INSIDE";
  node.strokeTopWeight = 1;
  node.strokeLeftWeight = 0;
  node.strokeRightWeight = 0;
  node.strokeBottomWeight = 0;
}
function bindBorderRight(inputs: BlocksInputs, node: FrameNode) {
  bindStrokeColor(node, sb(inputs.theme.light, "sidebar-border", "border"));
  node.strokeWeight = 1;
  node.strokeAlign = "INSIDE";
  node.strokeTopWeight = 0;
  node.strokeLeftWeight = 0;
  node.strokeRightWeight = 1;
  node.strokeBottomWeight = 0;
}

function iconOnly(
  inputs: BlocksInputs,
  name: string,
  size: number,
  onPrimary: boolean,
  active?: boolean,
): SceneNode | undefined {
  const t = inputs.theme.light;
  const color = onPrimary
    ? sb(t, "sidebar-primary-foreground", "primary-foreground")
    : active
      ? sb(t, "sidebar-accent-foreground", "accent-foreground")
      : sb(t, "sidebar-foreground", "foreground");
  const node = createNamedIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: iconCandidates(name),
    size,
    color,
  });
  if (node) node.name = "Icon";
  return node;
}

function appendText(
  inputs: BlocksInputs,
  parent: FrameNode,
  text: string,
  size: number,
  colorKey: string,
  weight: "Regular" | "Medium",
) {
  const node = figma.createText();
  applyFontText(inputs, node, text, size, colorKey, weight);
  parent.appendChild(node);
}

function applyFontText(
  inputs: BlocksInputs,
  node: TextNode,
  text: string,
  size: number,
  colorKey: string | undefined,
  weight: "Regular" | "Medium",
) {
  applyFont(node, "body", weight);
  node.characters = text;
  node.fontSize = size;
  const sizeToken =
    size === 12
      ? "font/size/xs"
      : size === 14
        ? "font/size/sm"
        : size === 16
          ? "font/size/base"
          : undefined;
  if (sizeToken) bindFontSize(node, inputs.primitives.get(sizeToken));
  if (colorKey) bindFill(node, inputs.theme.light.get(colorKey));
}

// The ordered list combined into the "Sidebar" component set.
export const SIDEBAR_VARIANTS: SidebarVariant[] = [
  { key: "sidebar-01", build: buildSidebar01 },
  { key: "sidebar-02", build: buildSidebar02 },
  { key: "sidebar-03", build: buildSidebar03 },
  { key: "sidebar-04", build: buildSidebar04 },
  { key: "sidebar-05", build: buildSidebar05 },
  { key: "sidebar-06", build: buildSidebar06 },
  { key: "sidebar-07", build: buildSidebar07 },
  { key: "sidebar-08", build: buildSidebar08 },
  { key: "sidebar-09", build: buildSidebar09 },
  { key: "sidebar-10", build: buildSidebar10 },
  { key: "sidebar-11", build: buildSidebar11 },
  { key: "sidebar-12", build: buildSidebar12 },
  { key: "sidebar-13", build: buildSidebar13 },
  { key: "sidebar-14", build: buildSidebar14 },
  { key: "sidebar-15", build: buildSidebar15 },
  { key: "sidebar-16", build: buildSidebar16 },
];
