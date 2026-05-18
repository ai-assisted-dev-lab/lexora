# Lexora — UI/UX Specification

> Version: 1.0 | Status: Locked for V1

---

## Design Identity

**Name:** Azure Glass Learning Platform

Lexora's visual language is clean, premium, and purposefully calm. It communicates focus and quality without being clinical. The palette is anchored in pale blue and white, with azure accents and soft gradients that give surfaces a light, glassy weight.

This is **not** a copy of Steam's dark interface. It borrows Steam's structural sense of a content library — shelves, catalog, owned collection — but reinterprets it in a light, airy register.

---

## Theme

- **Light theme only.** No dark mode. No dark mode toggle. No dark mode preparation.
- Background is white or very pale blue — never black, charcoal, or dark gray.
- Text is dark blue-gray on light backgrounds — never pure black (#000) for body text.

---

## Color Palette

| Role | Description | Approximate Range |
|---|---|---|
| Background | White to pale blue | `#F8FAFF` – `#EFF5FF` |
| Surface / Card | White to soft blue-tinted white | `#FFFFFF` – `#F0F6FF` |
| Primary accent | Sky blue to azure | `#3B82F6` – `#2563EB` |
| Secondary accent | Soft cyan | `#06B6D4` – `#0891B2` |
| Muted text | Blue-gray | `#64748B` – `#475569` |
| Body text | Dark blue-gray | `#1E293B` – `#334155` |
| Border/Divider | Very pale blue | `#DBEAFE` – `#BFDBFE` |
| Danger/Error | Soft red | `#EF4444` |
| Success | Soft green | `#22C55E` |
| Warning | Amber | `#F59E0B` |

All colors are defined as CSS custom properties in the Tailwind config. No hardcoded hex values in components.

---

## Typography

- **Font:** Inter (primary), falling back to system-ui
- **Scale:** Tailwind's default type scale, with `text-sm` as base for dense UI areas
- **Headings:** Semi-bold to bold, dark blue-gray
- **Body:** Regular weight, dark blue-gray
- **Monospace:** JetBrains Mono (for word IDs, debug info if needed)
- **No decorative fonts** in V1

---

## Application Shell Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Custom Title Bar]  Lexora          [─] [□] [✕]             │
├────────────┬─────────────────────────────────┬───────────────┤
│            │  [Search Bar]    [Notifs] [User] │               │
│  Left      ├─────────────────────────────────┤  Right        │
│  Sidebar   │                                 │  Widgets      │
│            │        Main Content Area        │  (optional,   │
│  Nav items │        (scrollable)             │   context-    │
│            │                                 │   dependent)  │
│  ─────     │                                 │               │
│  Decks     │                                 │               │
│  Stats     │                                 │               │
│  Settings  │                                 │               │
│            │                                 │               │
└────────────┴─────────────────────────────────┴───────────────┘
```

---

## Custom Title Bar

- Frameless Tauri window — no OS chrome
- Custom title bar region: Lexora wordmark left, window controls (minimize/maximize/close) right
- Draggable region covers the title bar strip
- Background matches app header (white to pale blue)
- Window controls styled to match the light palette — no default Windows chrome visible

---

## Left Sidebar

- Fixed width (~220–240px), full app height
- Lexora logo/wordmark at top
- Navigation items with icon + label
- Active state: azure accent background pill or left-border indicator
- Section dividers between nav groups
- No collapse in V1 (full sidebar always visible)

**Navigation items (learner):**
- Home / Discover
- My Library
- Review (Smart Review)
- Stats
- Achievements
- Settings

**Navigation items (owner, additional):**
- Data Studio (visible only to owner role)

---

## Top Header

- Full-width strip below title bar
- Left: breadcrumb or page title
- Center: global search bar (prominent, rounded, with search icon)
- Right: notification bell, user avatar/menu

---

## Discover Screen (Home/Catalog)

- Hero banner: large, full-width gradient card with featured deck or tip of the day
- Shelf rows below: "Continue Learning", "New This Week", "All Decks", etc.
- Each shelf is horizontally scrollable
- Deck cards: rounded, soft shadow, cover image/gradient, title, word count badge

---

## Deck Cards

- Rounded corners (`rounded-2xl` or `rounded-3xl`)
- Soft drop shadow
- Cover: colored gradient or image
- Title: bold, dark blue-gray
- Meta: word count, pack name — muted text
- Hover: subtle lift (scale + shadow via Framer Motion)
- Installed badge: azure pill overlay

---

## Word/Vocabulary Cards (in Review)

- Large central card, prominent headword
- IPA pronunciation below headword
- Audio play button (icon only, no label)
- Definition area revealed on flip
- Card flip animation: Framer Motion 3D flip

---

## Right Widgets Panel

- Appears on Discover, Library, and Stats screens
- Contains: Daily Goal progress ring, Streak counter, XP bar, Quick Stats
- Cards with soft shadow, pale blue background
- Collapsible in future — fixed in V1

---

## Motion and Animation

- Library: Framer Motion
- Card entry: fade-in + slide-up (short, ~200ms)
- Route transitions: crossfade (~150ms)
- Review card flip: 3D CSS transform via Framer Motion (~300ms)
- Hover effects: scale 1.02, shadow increase (~100ms ease-out)
- No janky layout shifts; prefer opacity and transform only

---

## Component Hierarchy

Built on **shadcn/ui** components, customized with Lexora tokens:

- `Button` — azure primary, outline secondary, ghost tertiary
- `Card` — pale blue surface, rounded-2xl, soft shadow
- `Input` / `SearchInput` — rounded-full for search, rounded-lg for forms
- `Badge` — for word count, pack type, status
- `Progress` — azure fill on pale blue track
- `Avatar` — for user icon
- `Tooltip` — for icon-only controls
- `Dialog` / `Sheet` — for modals and side panels
- `DropdownMenu` — for user menu and context menus

---

## Iconography

- Library: **Lucide React** exclusively
- Size: `16px` (inline), `20px` (nav), `24px` (actions)
- Color: inherit from text color or explicit accent
- No emoji in UI chrome (emoji allowed in achievement icons only)

---

## Accessibility

- All interactive elements keyboard-navigable
- Focus rings visible (azure, 2px offset)
- ARIA labels on icon-only buttons
- Minimum contrast ratios: 4.5:1 for body text, 3:1 for large text
- No color-only information encoding

---

## Responsive Behavior

- Target: 1280×800 minimum window size
- Layout is fixed-shell (not fluid web-responsive)
- Content areas scroll internally; shell chrome is fixed
- No mobile breakpoints needed in V1

---

## Screens — V1 Inventory

| Screen | Route |
|---|---|
| Login | `/login` |
| Discover | `/` or `/discover` |
| My Library | `/library` |
| Deck Detail | `/deck/:id` |
| Word Detail | `/word/:id` |
| Smart Review | `/review` |
| Session Summary | `/review/summary` |
| Stats | `/stats` |
| Achievements | `/achievements` |
| Settings | `/settings` |
| Admin / Data Studio | `/studio` (owner only) |
