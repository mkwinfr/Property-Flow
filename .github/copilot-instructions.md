# Property Flow - AI Coding Assistant Guide

## Project Overview

Property Flow is a multi-platform property management system for apartment turnovers and make-ready operations, consisting of:

- **Property Flow Tech** - Field technician PWA (React/TypeScript/Vite)
- **Property Flow Desktop** - Main dashboard web app (React/TypeScript/Vite)  
- **Property Flow Backend** - REST API server (Node.js/Express/Prisma/PostgreSQL)
- **Launcher** - Windows WPF launcher app (.NET 8/C#)

All projects share a unified visual language and data structures but run independently.

## Architecture Patterns

### Frontend Apps (Tech + Desktop)

**Component Integration Philosophy**: Components from Tech app are copied directly into Desktop app without modification. Import paths are adjusted from `@/types/makeReady` to `../../types/makeReady`. This maintains single source while allowing Desktop to embed Tech features within its sidebar layout.

**Shared State Management**: Both apps use `MakeReadyBoardProvider` context wrapper in root `App.tsx`. Components access via `useMakeReadyBoard()` hook. The provider manages turn state and CRUD operations in-memory before syncing to backend.

**API Configuration**: All API calls resolve through [src/config/api.ts](Property%20Flow%20Tech/src/config/api.ts) which implements production safety: remote deployments NEVER call localhost backends even if `VITE_API_BASE_URL` is misconfigured. Local dev allows localhost. Set `.env` with `VITE_API_BASE_URL=http://localhost:4000/api` for development.

**CSS Architecture**: All styles live in [src/styles/](Property%20Flow%20Tech/src/styles/) organized by specificity:
- [tokens.css](Property%20Flow%20Tech/src/styles/tokens.css) - CSS custom properties (`--pf-navy-950`, `--pf-coral`, etc.)
- [base.css](Property%20Flow%20Tech/src/styles/base.css) - Global resets
- [utilities.css](Property%20Flow%20Tech/src/styles/utilities.css) - Single-purpose classes
- [components.css](Property%20Flow%20Tech/src/styles/components.css) - Component styles
- [pages.css](Property%20Flow%20Tech/src/styles/pages.css) - Page layouts

**NO inline styles**. Use custom properties for all colors/spacing. Reference [CSS_ARCHITECTURE.md](Property%20Flow%20Tech/CSS_ARCHITECTURE.md) for details.

### Backend Architecture

**Layered Structure** ([STRUCTURE.md](Property%20Flow%20Backend/STRUCTURE.md)):
- **Routes** ([src/routes/](Property%20Flow%20Backend/src/routes/)) - HTTP endpoint definitions
- **Controllers** (planned) - Request parsing and response formatting
- **Services** (planned) - Business logic and Prisma queries
- **Middleware** ([src/middleware/](Property%20Flow%20Backend/src/middleware/)) - Error handling, validation, auth

**Database**: PostgreSQL with Prisma ORM. Schema in [prisma/schema.prisma](Property%20Flow%20Backend/prisma/schema.prisma). Use enums for status fields (`TurnStatus`, `WorkOrderStatus`, `OccupancyStatus`). All migrations must be named: `npm run prisma:migrate`.

**Strict TypeScript**: Explicit return types required. Avoid `any`. Interfaces for all data shapes. Files use camelCase, functions camelCase, classes/interfaces PascalCase.

## Critical Workflows

### Development Commands

**Tech/Desktop Apps**:
```bash
npm run dev          # Vite dev server on :5173
npm run build        # TypeScript compile + Vite build
npm run type-check   # TypeScript validation
npm run lint:fix     # ESLint auto-fix
```

**Backend**:
```bash
npm run dev              # ts-node-dev on :4000
npm run prisma:migrate   # Create migration (prompts for name)
npm run prisma:generate  # Sync Prisma client
npm run prisma:seed      # Seed with waterford-units.json data
npm run prisma:studio    # Database UI browser
```

**Launcher** (C#/WPF):
- Build through Visual Studio or `dotnet build` in [Launcher/Source/](Launcher/Source/)
- Output: [Launcher/PS Launcher.exe](Launcher/)
- Config: [Launcher/config.json](Launcher/config.json)

### Component Creation Pattern (Tech App)

Follow [README.md](Property%20Flow%20Tech/README.md) structure:

```typescript
import { useState } from 'react';

interface MyComponentProps {
  title: string;
  onSubmit: (value: string) => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, onSubmit }) => {
  const [state, setState] = useState('');
  
  return <div>{title}</div>;
};

export default MyComponent;
```

Place styles in appropriate [src/styles/](Property%20Flow%20Tech/src/styles/) file using custom properties.

### Punch List Integration

Punch lists are implemented as modal overlays on turn cards ([PUNCH_LIST_IMPLEMENTATION_SUMMARY.md](PUNCH_LIST_IMPLEMENTATION_SUMMARY.md)):
- Template data: [src/data/punchTemplates.ts](src/data/punchTemplates.ts)
- Component: [src/components/PunchList/PunchListModal.tsx](Property%20Flow%20Tech/src/components/PunchList/PunchListModal.tsx)
- Types: [src/types/punch-list.ts](Property%20Flow%20Tech/src/types/punch-list.ts)
- Triggered by 📋 button on [MakeReadyBoard](Property%20Flow%20Tech/src/pages/MakeReadyBoard/) turn cards

Backend API endpoints ready to implement:
- `GET /api/turns/:turnId/punch-list` - Fetch template + saved items
- `PATCH /api/turns/:turnId/punch-items/:itemId` - Update status

## Project-Specific Conventions

**File Organization**: Pages go in `src/pages/[PageName]/`, components in `src/components/[ComponentName]/`. Each may have accompanying `.css` file or use shared styles from `src/styles/`.

**Type Definitions**: Shared types in `src/types/`. Backend types mirror frontend where possible. Use explicit interfaces over `type` aliases.

**Environment Variables**: Vite apps use `import.meta.env.VITE_*`. Backend uses `process.env.*`. Both read from `.env` files. Never commit `.env`, only `.env.example`.

**Naming**: React components PascalCase, files match component name, hooks use `use*` prefix, contexts use `*Context` suffix with matching `*Provider` component.

**Import Paths**: Tech app uses `@/` alias for `src/`. Desktop uses relative paths due to component copying strategy.

**Color Theming**: All apps use dark theme with Property Flow design tokens. Primary: `--pf-navy-950` background, `--pf-cream` text. Accents: `--pf-coral`, `--pf-sky`, `--pf-purple`. Status colors: `--pf-green` (complete), `--pf-red` (alert).

**API Response Format**: All endpoints return JSON. Errors use consistent structure handled by [middleware/errorHandler.ts](Property%20Flow%20Backend/src/middleware/errorHandler.ts).

## Key Integration Points

**Frontend → Backend**: All API calls use [src/config/api.ts](Property%20Flow%20Tech/src/config/api.ts) `apiUrl()` helper. Health check: `GET /` returns "Property Flow Backend Running".

**Desktop ↔ Tech**: Desktop imports entire page components from copied Tech code. `MakeReadyBoardProvider` wraps root. Examples: [/management/apartments](Property%20Flow%20Desktop/src/pages/Management/Apartments.tsx) uses [Inventory](Property%20Flow%20Desktop/src/pages/Inventory/), [/maintenance/make-ready](Property%20Flow%20Desktop/src/pages/Maintenance/MakeReady.tsx) uses [MakeReadyBoard](Property%20Flow%20Desktop/src/pages/MakeReadyBoard/).

**Database ↔ Backend**: Prisma client in [src/db/prisma.ts](Property%20Flow%20Backend/src/db/prisma.ts). Always include relations in queries when needed. Use transactions for multi-table operations.

**Event Broadcasting**: Frontend listens for custom events (`window.addEventListener('turn-created')`) to refresh MakeReadyBoard state. Dispatched after successful POST to `/api/turns`.

## Documentation References

- [Property Flow Tech README](Property%20Flow%20Tech/README.md) - Frontend dev guide
- [Property Flow Backend README](Property%20Flow%20Backend/README.md) - API setup
- [Property Flow Desktop README](Property%20Flow%20Desktop/README.md) - Integration status
- [CSS_ARCHITECTURE.md](Property%20Flow%20Tech/CSS_ARCHITECTURE.md) - Styling system
- [STRUCTURE.md](Property%20Flow%20Backend/STRUCTURE.md) - Backend layers
- [DEVELOPMENT.md](Property%20Flow%20Backend/DEVELOPMENT.md) - Backend workflows
- [PUNCH_LIST_IMPLEMENTATION_SUMMARY.md](PUNCH_LIST_IMPLEMENTATION_SUMMARY.md) - Punch list feature
