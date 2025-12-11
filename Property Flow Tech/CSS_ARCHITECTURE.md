# Frontend Project Structure

## Directory Organization

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
