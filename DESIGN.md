---
name: Obsidian Data
colors:
  surface: "#0b1326"
  surface-dim: "#0b1326"
  surface-bright: "#31394d"
  surface-container-lowest: "#060e20"
  surface-container-low: "#131b2e"
  surface-container: "#171f33"
  surface-container-high: "#222a3d"
  surface-container-highest: "#2d3449"
  on-surface: "#dae2fd"
  on-surface-variant: "#c7c4d7"
  inverse-surface: "#dae2fd"
  inverse-on-surface: "#283044"
  outline: "#908fa0"
  outline-variant: "#464554"
  surface-tint: "#c0c1ff"
  primary: "#c0c1ff"
  on-primary: "#1000a9"
  primary-container: "#8083ff"
  on-primary-container: "#0d0096"
  inverse-primary: "#494bd6"
  secondary: "#89ceff"
  on-secondary: "#00344d"
  secondary-container: "#00a2e6"
  on-secondary-container: "#00344e"
  tertiary: "#d0bcff"
  on-tertiary: "#3c0091"
  tertiary-container: "#a078ff"
  on-tertiary-container: "#340080"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  primary-fixed: "#e1e0ff"
  primary-fixed-dim: "#c0c1ff"
  on-primary-fixed: "#07006c"
  on-primary-fixed-variant: "#2f2ebe"
  secondary-fixed: "#c9e6ff"
  secondary-fixed-dim: "#89ceff"
  on-secondary-fixed: "#001e2f"
  on-secondary-fixed-variant: "#004c6e"
  tertiary-fixed: "#e9ddff"
  tertiary-fixed-dim: "#d0bcff"
  on-tertiary-fixed: "#23005c"
  on-tertiary-fixed-variant: "#5516be"
  background: "#0b1326"
  on-background: "#dae2fd"
  surface-variant: "#2d3449"
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: "700"
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "600"
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 18px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 22px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: "700"
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 2rem
  gutter: 1rem
  sidebar-width: 260px
  stack-xs: 0.25rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style

The design system is engineered for developers and data architects who require a high-performance, focused environment for managing complex NoSQL structures. The brand personality is **systematic, precise, and authoritative**, moving away from the playful or organic aesthetics often found in modern SaaS to embrace a "high-end tool" feel.

The visual style is **Corporate Modern with subtle Glassmorphism**. It prioritizes information density and clarity without sacrificing aesthetic sophistication. By utilizing a "Dark Mode First" approach, the interface reduces eye strain during long sessions while using vibrant accent colors to guide the user's eye to critical actions and data states. The aesthetic evokes the feeling of a high-tech command center: dark, structured, and incredibly powerful.

## Colors

The palette is rooted in a deep, sophisticated "Ink" spectrum. The background uses a near-black slate to provide maximum contrast for data.

- **Primary (#6366f1):** An Indigo-vibrant blue used for primary actions, active states, and focus rings.
- **Secondary/Tertiary:** Variations of Sky Blue and Violet are reserved for syntax highlighting and data visualization (e.g., distinguishing between Strings, Booleans, and Objects).
- **Surface & Borders:** We use a strict hierarchy of Slate greys. Borders are kept thin and low-contrast (#1e293b) to keep the UI clean, while active surfaces use a slightly lighter tint to indicate elevation.
- **Functional Colors:** Success (Emerald), Warning (Amber), and Error (Rose) are used sparingly and always in high-saturation to ensure they break through the dark background.

## Typography

The typography system balances the readability of Inter for UI elements with the technical precision of JetBrains Mono for data displays.

- **UI Text:** Use Inter for all navigational elements, buttons, and settings.
- **Data & Code:** Use JetBrains Mono for JSON documents, query editors, and terminal outputs. This ensures that characters like `0` vs `O` and `l` vs `1` are easily distinguishable.
- **Hierarchy:** Use `label-caps` for table headers and section grouping to maintain a "dashboard" feel.
- **Scale:** Keep font sizes relatively small (13px-14px for body) to allow for high information density, which is critical for database management.

## Layout & Spacing

The layout follows a **structured, multi-pane grid** typical of IDEs.

- **Global Layout:** A fixed left sidebar for navigation, a secondary "Collection/Table" explorer, and a primary fluid workspace for the data editor.
- **Density:** We utilize a "Compact" spacing model. Vertical rhythm is tight (8px increments) to maximize the number of visible data rows.
- **Breakpoints:**
  - _Desktop (1440px+):_ Full three-pane visibility.
  - _Laptop (1024px):_ Sidebar collapses to icons.
  - _Tablet/Mobile:_ Navigation moves to a bottom bar or hamburger menu; query results scroll horizontally.

## Elevation & Depth

Depth in this design system is achieved through **Tonal Layering** and **Subtle Translucency**, rather than heavy shadows.

1.  **Level 0 (Base):** The darkest color (#020617), used for the application background.
2.  **Level 1 (Surface):** The primary container color (#0f172a), used for sidebars and the main editor area.
3.  **Level 2 (Floating):** Modals, dropdowns, and tooltips use a slightly lighter slate with a **12px Backdrop Blur** (80% opacity) to provide a "glass" effect that suggests they are floating above the data.
4.  **Outlines:** Instead of shadows, use 1px solid borders (#1e293b) to define edges. On active or focused states, the border color shifts to the Primary Accent.

## Shapes

The design system uses a **Medium (8px)** corner radius for most components. This creates a balance between the "harshness" of a purely professional tool and the "softness" of modern web apps.

- **Base Radius (8px):** Buttons, Input fields, and Cards.
- **Large Radius (16px):** Modals and large containers.
- **Small Radius (4px):** Code snippets, inline tags, and checkboxes.
- **Sharp Edges:** Tab items and pane dividers remain sharp (0px) when they are docked to the edges of the screen to maintain the "integrated" IDE appearance.

## Components

- **Buttons:** Primary buttons use a solid Indigo fill with white text. Secondary buttons use a ghost style with a subtle border that glows slightly on hover.
- **Input Fields:** Dark background (#1e1e2e) with a subtle inset shadow and 1px border. The focus state must clearly highlight the entire perimeter in the primary accent color.
- **Data Cards:** Used for individual document view. Should feature a "monaco-style" header with the Document ID and a collapse/expand toggle.
- **Syntax Highlighting:** A custom theme using the Primary/Secondary/Tertiary palette. Strings in Sky Blue, Numbers in Purple, Booleans in Amber.
- **Tabs:** Underline style for the active tab using the primary indigo color. Inactive tabs should have lowered opacity.
- **Query Bar:** A prominent, full-width input field at the top of the data view, utilizing the monospaced font for the query string.
