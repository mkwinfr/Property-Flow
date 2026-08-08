# Property Suite UI Theme Guide

This guide is the source of truth for the warm premium Property Suite visual system. It covers the resident portal, staff workspace, desktop launcher, and generated PDFs.

## Brand direction

The product should feel calm, established, residential, and operationally trustworthy. The system combines:

- deep evergreen for identity, navigation, and primary actions;
- ivory and cream for warm work surfaces;
- sage for quiet secondary surfaces and selection states;
- brass for restrained emphasis, focus, progress, and premium detail;
- clear semantic colors for success, warning, danger, and information.

The resident portal intentionally uses more breathing room. Staff tools use the same brand language at a higher information density. The launcher is a dark operational variant. PDFs prioritize print contrast.

## Canonical tokens

Web tokens live in `src/client/styles/tokens.css`. Use these variables instead of adding one-off brand colors.

| Purpose | Token | Value |
| --- | --- | --- |
| Deepest evergreen | `--brand-evergreen-950` | `#10271f` |
| Primary evergreen | `--brand-evergreen-900` | `#173e31` |
| Secondary evergreen | `--brand-evergreen-800` | `#245443` |
| Interactive evergreen | `--brand-evergreen-700` | `#315f4d` |
| Sage | `--brand-sage` | `#dfe9df` |
| Soft sage | `--brand-sage-soft` | `#edf3ec` |
| Ivory workspace | `--brand-ivory` | `#f7f3eb` |
| Cream surface | `--brand-cream` | `#fffdf8` |
| Brass accent | `--brand-brass` | `#b58b48` |
| Strong brass text | `--brand-brass-strong` | `#977038` |
| Ink | `--brand-ink` | `#18342b` |
| Muted ink | `--brand-ink-soft` | `#52675f` |

Use `--brand-border`, `--brand-focus`, and the three `--brand-shadow-*` tokens for borders, keyboard focus, and elevation.

Semantic tokens are `--brand-success`, `--brand-warning`, `--brand-danger`, and `--brand-info`, each with a matching `-soft` background. Do not use brand brass as an error or warning color when the state has semantic meaning.

## Typography and capitalization

- Body and controls: `--font-body`.
- Display headings and premium brand moments: `--font-display`.
- Diagnostics and logs: `--font-mono`.
- Use Title Case for page titles, panel headings, dialog titles, and short named sections.
- Use sentence case for descriptions, help text, field labels, buttons, status explanations, and long headings that read as questions.
- Keep conventional product terms consistent: `Make Ready`, `Work Order`, `Admin Ops`, and `Property Suite`.
- Never transform user-entered, imported, or database-provided text. Capitalize only static interface copy.

## Spacing, borders, and elevation

- Dense staff controls should remain approximately 34–44 px tall.
- Portal controls can use 44–52 px targets and more vertical space.
- Standard staff surfaces use 14–18 px radii; premium login and hero surfaces can use 20–24 px.
- Use one subtle border plus one shadow. Avoid stacking strong borders and strong shadows.
- `--brand-shadow-soft` is for dense cards and toolbars.
- `--brand-shadow` is for panels, login cards, and dialogs.
- `--brand-shadow-hover` is reserved for interactive card hover states.

## Web architecture and scoping

Styles load in this order from `src/client/main.tsx`:

1. `styles/tokens.css` — canonical brand tokens;
2. `styles.css` — legacy base and domain layout rules;
3. `styles/portal.css` — resident portal aliases and portal-only presentation;
4. `styles/staff.css` — staff-only presentation.

Keep portal rules under `.portal-app` or `.portal-login-page`. Keep staff rules under `.staff-app`, `.staff-login-page`, or `.staff-app-loading`. Do not add unscoped page-specific theme overrides to `styles.css`.

When adding a new component:

1. Put structural layout rules beside the existing domain layout rules when necessary.
2. Put visual theme rules in the scoped theme file.
3. Consume canonical tokens or scoped aliases.
4. Test both portal and staff routes to detect cascade leaks.

## Component recipes

### Page header

- Use `.page-heading` for staff routes.
- Use a concise eyebrow, a Title Case `h1`, and one sentence of supporting text.
- Use `.page-heading--hero` only for high-value overview moments, not every page.

### Panels and cards

- Use `.panel` as the default staff surface.
- Keep operational lists and tables compact.
- Add hover elevation only when the whole card is interactive.
- Use sage for quiet grouping and brass for selection, never for large text areas.

### Buttons and fields

- Primary actions use evergreen.
- Secondary actions use soft brass or sage.
- Destructive actions retain danger semantics.
- All interactive elements need a visible `:focus-visible` ring using `--brand-focus`.
- Inputs use cream/white surfaces, restrained borders, and a soft evergreen focus halo.

### Tables and tabs

- Table headers use a soft sage background and muted ink.
- Preserve sticky headers and horizontal scrolling for dense data.
- Active tabs use evergreen text with a thin brass indicator.
- Do not increase staff table row heights to portal dimensions.

### Statuses and progress

- Success: green.
- Warning or pending review: amber.
- Error, emergency, rework, or destructive: red.
- Informational or assigned/in progress: blue.
- Progress tracks may use evergreen-to-brass, but status meaning must still be visible without color.

### Dialogs, drawers, and search

- Use a blurred dark-evergreen scrim.
- Dialog surfaces use cream, 18–22 px radii, and `--brand-shadow`.
- Dialog headers may use an ivory-to-sage wash.
- Nested dialogs must remain visually above the parent and preserve keyboard focus.

### Empty, loading, and error states

- Empty states use a dashed brand border and a small brass icon surface.
- Loading states should be calm and avoid rapid animation.
- Error states use semantic danger colors, not brass.
- Respect `prefers-reduced-motion`.

## Responsive rules

- Staff navigation becomes a drawer at the established mobile breakpoint.
- Portal navigation retains its portal-specific drawer and bottom navigation.
- Dense tables may scroll horizontally; do not force every table into oversized cards.
- Dialogs become bottom-aligned sheets on narrow screens when the base component supports it.
- Test at 360 px, 768 px, 1024 px, and a representative desktop width.
- Keep 44 px touch targets for primary mobile interactions.

## Launcher variant

The launcher uses the same identity with a dark operational palette in `launcher/src/styles.css`.

- Use darkest evergreen for the window and rails.
- Use translucent evergreen panels with brass borders and highlights.
- Keep diagnostics compact and high contrast.
- Preserve semantic green/red service status colors.
- Keep logs near-black with a readable monospace foreground.
- Do not copy light portal surfaces into the launcher.

## PDF variant

PDF colors are defined locally in:

- `src/server/turns/pdf.ts`
- `src/server/operations/workOrderPdf.ts`

Use evergreen for rules, headings, and certification; brass for small brand emphasis; sage for quiet fills; ink for body text; and muted ink for metadata. Ensure acceptable grayscale contrast and avoid large dark backgrounds that waste ink.

## Future-change checklist

- [ ] Reuse a canonical token instead of introducing a close duplicate.
- [ ] Keep portal and staff selectors inside their scope roots.
- [ ] Preserve staff workflow density.
- [ ] Preserve semantic status meaning and non-color labels.
- [ ] Apply Title Case only to static headings.
- [ ] Verify keyboard focus and reduced-motion behavior.
- [ ] Test desktop and mobile layouts.
- [ ] Check portal routes for visual regressions.
- [ ] Build the launcher when launcher styles change.
- [ ] Generate representative PDFs when PDF code changes.
- [ ] Run lint, typecheck, tests, and production builds before deployment.
