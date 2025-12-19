# CSS Architecture Guide

## Overview

Property Flow uses a **hybrid CSS architecture** combining global stylesheets with component-specific CSS files for maintainability and scalability.

## File Structure

```
src/styles/                     # Global CSS (imported in main.tsx)
├── tokens.css                  # CSS custom properties (colors, spacing)
├── base.css                    # Global resets and base styles
├── utilities.css               # Utility classes (.pf-card, .pf-pill)
├── components.css              # Shared component styles
├── pages.css                   # Page layout patterns
├── animations.css              # Keyframe animations
└── punch-list-modal.css        # Large modal component styles

src/components/                 # Component-specific CSS (if needed)
└── [ComponentName]/
    └── ComponentName.css       # Only for complex, isolated components

src/pages/                      # Page-specific CSS
└── [PageName]/
    └── PageName.css            # Page-specific layouts and styles
```

## CSS Guidelines

### 1. tokens.css - Single Source of Truth

**All colors, spacing, and design tokens MUST be defined here.**

```css
:root {
  /* Navy Shades - Primary backgrounds */
  --pf-navy-950: #1e1f25;
  --pf-navy-800: #272830;
  --pf-navy-750: #2d2e36;
  
  /* Text Colors */
  --pf-cream: #f6f7fb;
  --pf-muted: #9fa8c6;
  
  /* Semantic Aliases */
  --bg: #1a1b20;
  --bg-elevated: var(--pf-navy-800);
  --border-default: rgba(255, 255, 255, 0.1);
  
  /* Spacing System */
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
}
```

**Rules:**
- ✅ Use `var(--pf-*)` tokens in all CSS files
- ✅ Add new colors to tokens.css, never hardcode
- ❌ Never use hardcoded hex/rgb values
- ✅ Use semantic aliases (`--bg`, `--text`) for common cases

### 2. components.css - Shared Components

**For components used across multiple pages.**

Examples: `.pf-card`, `.pf-pill`, `.pf-button`, `.punch-overview-*`

```css
.pf-card {
  background: var(--pf-navy-800);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
}
```

**When to add here:**
- Component appears in 2+ pages
- Component is part of the design system (cards, pills, modals)
- Styles are reusable across Desktop and Tech apps

### 3. pages.css - Layout Patterns

**Page-level layout utilities and container styles.**

Examples: `.apartments-list`, `.make-ready-layout`, modal overlays

**When to add here:**
- Grid/flexbox layouts used across pages
- Modal/overlay patterns
- Responsive breakpoints

### 4. Page-Specific CSS (e.g., MakeReadyBoard.css)

**Only for styles unique to that page.**

**When to create:**
- Page has complex layout logic
- Styles won't be reused elsewhere
- Keeps page folder self-contained

**Rules:**
- Still use tokens from `tokens.css`
- Keep page CSS minimal
- Move reusable pieces to `components.css`

### 5. Component-Specific CSS

**Avoid unless component is complex AND isolated.**

**Bad:** Creating `ButtonGroup.css` when styles could go in `components.css`  
**Good:** Complex PunchListOverview has been moved to `components.css`

## Migration Checklist

When adding new components:

1. ✅ Define any new colors/spacing in `tokens.css`
2. ✅ Check if similar styles exist in `components.css`
3. ✅ Use `var(--pf-*)` tokens, never hardcode values
4. ✅ Add shared components to `components.css`
5. ✅ Page-specific styles go in page folder CSS
6. ✅ Document any new patterns here

## Desktop ↔ Tech Sync

**Global files** (`styles/*.css`) can be copied directly between Tech and Desktop apps.

**Page CSS** stays with each page folder - adjust import paths:
- Tech: `@/config/api` 
- Desktop: `../../config/api`

## Anti-Patterns to Avoid

❌ Creating separate CSS file for every component  
❌ Hardcoding colors instead of using tokens  
❌ Duplicating styles instead of using shared classes  
❌ Inline styles (use CSS classes)  
❌ Using `!important` (fix specificity instead)

```
src/
├── main.tsx                    # Application entry point
├── App.tsx                     # Root component
├── vite-env.d.ts               # Vite type declarations
│
├── pages/                      # Full-page components with routing
│   ├── Dashboard/
│   │   ├── Dashboard.tsx       # Main app shell and routing
│   │   └── Dashboard.module.css (future: scoped styles)
│   ├── ApartmentDetail/
│   │   └── ApartmentDetail.tsx
│   ├── Inventory/
│   │   └── Inventory.tsx
│   ├── MakeReadyBoard/
│   │   ├── MakeReadyBoard.ts
│   │   └── MakeReadyBoard.tsx
│   ├── Settings/
│   │   └── Settings.tsx
│   └── StartPunch/
│       └── StartPunch.tsx
│
├── components/                 # Reusable UI components
│   ├── AppDrawer/
│   │   └── AppDrawer.tsx
│   ├── Dock/
│   │   └── Dock.tsx            # Bottom navigation
│   └── SplashScreen/
│       └── SplashScreen.tsx
│
├── hooks/                      # Custom React hooks (placeholder)
│   └── README.md              # Hook documentation
│
├── utils/                      # Utility functions (placeholder)
│   ├── api.ts                 # API client methods
│   └── README.md              # Utility documentation
│
├── types/                      # TypeScript type definitions (placeholder)
│   ├── apartment.ts           # Apartment-related types
│   ├── turn.ts                # Turn/punch types
│   ├── api.ts                 # API response types
│   └── README.md              # Type documentation
│
├── assets/                     # Static assets
│   └── (images, icons, etc.)
│
└── styles/                     # Global CSS organized by layer
    ├── tokens.css             # Design tokens (colors, fonts, sizes)
    ├── base.css               # Global reset and app shell
    ├── utilities.css          # Reusable utility classes
    ├── components.css         # Component-specific styles
    ├── pages.css              # Page layout styles
    ├── typography.css         # Font families and text scales
    └── animations.css         # Keyframe animations and transitions
```

## CSS Architecture

The stylesheet uses a **layered cascade approach** based on ITCSS principles:

### 1. tokens.css - Design System
Define all design tokens as CSS custom properties:
```css
:root {
  --pf-navy-950: #1e1f25;
  --pf-cream: #f6f7fb;
  --spacing-4: 4px;
  --font-sans: 'Nunito Sans', system-ui;
}
```

### 2. base.css - Foundation
Global reset and app-level styles:
```css
* { box-sizing: border-box; }
html, body, #root { margin: 0; padding: 0; }
.app-root { min-height: 100vh; }
```

### 3. utilities.css - Reusable Patterns
Single-responsibility utility classes:
```css
.text-center { text-align: center; }
.mt-4 { margin-top: var(--spacing-4); }
.flex-center { display: flex; align-items: center; justify-content: center; }
```

### 4. components.css - Component Styles
Styles for reusable components:
```css
.button { padding: var(--spacing-4) var(--spacing-8); }
.card { background: var(--bg); border-radius: 8px; }
```

### 5. pages.css - Page Layouts
Page-specific layout styles:
```css
.dashboard-root { display: grid; grid-template-areas: "content" "dock"; }
```

### 6. typography.css - Text Styles
Font definitions and text scales:
```css
.pf-page-title { font-family: var(--font-heading); font-size: 24px; }
```

### 7. animations.css - Motion
Keyframe animations and transitions:
```css
@keyframes appFadeIn { from { opacity: 0; } to { opacity: 1; } }
```

## Design Tokens

### Colors
- **Brand**: Navy (950-700), Cream, Coral
- **Semantic**: Success, Error, Warning, Info
- **Neutral**: Ink, Muted shades

### Typography
- **Headings**: Montserrat (600, 700 weight)
- **Body**: Nunito Sans (400, 500, 600, 700 weight)
- **Scales**: H1-H6 sizes defined in typography.css

### Spacing
- **Base unit**: 4px
- **Scale**: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64px
- **Usage**: Padding, margin, gaps

### Component Creation

When creating a new component:

1. **Create component directory**
   ```
   src/components/YourComponent/
   ├── YourComponent.tsx
   └── YourComponent.module.css (optional, if scoped styles needed)
   ```

2. **Define TypeScript types**
   ```tsx
   interface YourComponentProps {
     // Props definition
   }
   ```

3. **Use existing CSS classes**
   ```tsx
   export const YourComponent: React.FC<YourComponentProps> = (props) => {
     return <div className="your-component">Content</div>;
   };
   ```

4. **Add to components.css if needed**
   ```css
   .your-component {
     /* Component-specific styles */
   }
   ```

## Best Practices

### CSS
- ✅ Use CSS custom properties for consistency
- ✅ Keep selector specificity low
- ✅ Use semantic class names (BEM or descriptive)
- ✅ Group related rules
- ✅ Avoid inline styles
- ❌ Don't use !important
- ❌ Avoid deep nesting
- ❌ Don't hardcode colors/sizes

### Component Structure
- ✅ One main component per file
- ✅ Export default component at bottom
- ✅ Types before component definition
- ✅ Keep components focused and small
- ❌ Don't mix concerns (styles in components)
- ❌ Avoid prop drilling (use Context for global state)

### Naming Conventions
- **Components**: PascalCase (`ApartmentCard`)
- **Utilities**: kebab-case (`.text-center`)
- **CSS Variables**: kebab-case (`--pf-navy-950`)
- **Functions**: camelCase (`handleClick`)
- **Types**: PascalCase (`ApartmentProps`)

## Responsive Design

Currently optimized for mobile (field technician use case).

Use CSS media queries for larger screens:
```css
@media (min-width: 768px) {
  .dashboard-root {
    grid-template-columns: 1fr auto;
  }
}
```

## Performance

- **CSS**: Organized by importance - unused layers can be removed
- **Component size**: Each <10KB compressed
- **Bundle**: Styles included in main chunk for PWA offline support
- **Caching**: Service worker caches CSS for offline use

## Future Improvements

- [ ] Implement CSS Modules for component scoping
- [ ] Add CSS preprocessor (Sass/Less) if needed
- [ ] Create Storybook for component documentation
- [ ] Add visual regression testing
- [ ] Implement dark mode toggle
- [ ] Add print styles for receipts/reports
