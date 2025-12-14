# Property Suite Desktop

Main dashboard application for Property Suite - a web-based desktop app with full property management capabilities.

## Project Structure

```
Property Flow Desktop/
├── electron/                   # (Reserved for future Electron integration)
├── src/
│   ├── components/
│   │   ├── Layout/            # Main layout with sidebar
│   │   ├── Sidebar/           # Navigation sidebar component
│   │   ├── PlaceholderPage/   # Reusable placeholder component
│   │   └── ProtectedRoute.tsx # Route protection wrapper
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication state management
│   ├── hooks/
│   │   └── useMakeReadyBoard.tsx # MakeReadyBoard context provider (integrated from Tech)
│   ├── types/
│   │   └── makeReady.ts       # Make Ready types (integrated from Tech)
│   ├── pages/
│   │   ├── Dashboard/         # Dashboard section pages
│   │   ├── Management/        # Management section pages
│   │   │   └── Apartments.tsx # ✅ INTEGRATED: Uses Inventory component from Tech
│   │   ├── Maintenance/       # Maintenance section pages
│   │   │   └── MakeReady.tsx  # ✅ INTEGRATED: Uses MakeReadyBoard from Tech
│   │   ├── Leasing/           # Leasing section pages
│   │   ├── Admin/             # Administration section pages
│   │   ├── Login/             # Login page
│   │   ├── Inventory/         # ✅ Copied from Tech app (used by Apartments route)
│   │   └── MakeReadyBoard/    # ✅ Copied from Tech app (includes Board + TurnTechView)
│   ├── styles/
│   │   └── index.css          # Global styles + integrated Tech app compatibility styles
│   ├── App.tsx                # Main app component with routing + MakeReadyBoardProvider
│   ├── main.tsx               # React entry point
│   └── vite-env.d.ts          # Vite environment type definitions
├── .env                        # Environment configuration (API_BASE_URL)
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## ✅ Integration Status

### Successfully Integrated Components

1. **Apartments (Inventory) UI** - `/management/apartments`
   - ✅ Integrated from `Property Flow Tech/src/pages/Inventory`
   - ✅ Renders inside Desktop layout with sidebar
   - ✅ Uses global dark theme styles
   - ✅ No modifications to original component

2. **Make Ready Board UI** - `/maintenance/make-ready`
   - ✅ Integrated from `Property Flow Tech/src/pages/MakeReadyBoard`
   - ✅ Includes main board component + TurnTechView detail panel
   - ✅ MakeReadyBoardProvider context wrapped around entire app
- ✅ Connected to backend API via VITE_API_URL
   - ✅ Event listeners for refresh/turn-created working
   - ✅ No modifications to original component logic

### Integration Approach

**No Duplication**: Components were copied from Tech app to Desktop app src directory and imported directly, not rebuilt.

**Minimal Adaptation**:
- Fixed import paths (changed `@/types/makeReady` to `../../types/makeReady`)
- Added `.env` file with `VITE_API_URL=https://api.propertysuite.net` (override locally as needed)
- Added `vite-env.d.ts` for TypeScript environment types
- Added compatibility CSS classes (`.pf-page`, `.page-root`, etc.) to global styles

**Layout Compatibility**:
- Both components render inside the Desktop app's `<Layout>` component
- Sidebar navigation remains visible
- Dark theme maintained throughout
- No scrollbar conflicts

## Information Architecture

### Navigation Structure

**Dashboard**
- Overview (`/dashboard`)
- My Tasks (`/dashboard/tasks`)
- Alerts & Issues (`/dashboard/alerts`)
- Activity Feed (`/dashboard/activity`)

**Management**
- Properties (`/management/properties`)
- **Apartments (`/management/apartments`)** - ✅ **INTEGRATED: Inventory component from Tech**
- Residents / Tenants (`/management/residents`)
- Vendors (`/management/vendors`)
- Owners / Portfolios (`/management/portfolios`)

**Maintenance**
- **Make Ready Board (`/maintenance/make-ready`)** - ✅ **INTEGRATED: MakeReadyBoard + TurnTechView from Tech**
- Work Orders (`/maintenance/work-orders`)
- Tasks (`/maintenance/tasks`)
- Inspections (`/maintenance/inspections`)
- Schedule (`/maintenance/schedule`)
- Vendors (`/maintenance/vendors`)
- Costs & Estimates (`/maintenance/costs`)

**Leasing**
- Availability (`/leasing/availability`)
- Applications (`/leasing/applications`)
- Leases (`/leasing/leases`)
- Showings (`/leasing/showings`)
- Marketing (`/leasing/marketing`)

**Administration**
- Users & Roles (`/admin/users`)
- Templates (`/admin/templates`)
- Categories & Tags (`/admin/categories`)
- Vendors & Rates (`/admin/vendor-rates`)
- Notifications (`/admin/notifications`)
- Integrations (`/admin/integrations`)
- Audit Log (`/admin/audit`)
- System Settings (`/admin/settings`)

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development Mode

Run the Vite dev server:

```bash
npm run dev
```

Server will start at `http://localhost:5175`

### Build for Production

```bash
npm run build
```

Build output: `dist/` directory

## Environment Configuration

Create/edit `.env` file in project root:

```env
VITE_API_URL=https://api.propertysuite.net
```

This configures the backend API endpoint for Make Ready Board and other features.

## Integrated Components - Technical Details

### Apartments/Inventory Integration

**File**: `src/pages/Management/Apartments.tsx`

```tsx
import Inventory from '../Inventory/Inventory';

const ManagementApartments = () => {
  return <Inventory />;
};
```

**Source**: Copied from `Property Flow Tech/src/pages/Inventory/`

**CSS**: Uses `.pf-page`, `.page-root` classes - compatibility styles added to `src/styles/index.css`

**No modifications** to original Inventory component.

### Make Ready Board Integration

**File**: `src/pages/Maintenance/MakeReady.tsx`

```tsx
import MakeReadyBoard from '../MakeReadyBoard/MakeReadyBoard.tsx';

const MaintenanceMakeReady = () => {
  return <MakeReadyBoard />;
};
```

**Source**: Copied from `Property Flow Tech/src/pages/MakeReadyBoard/`

**FiIcons**: Lucide React
- **Styling**: CSS (vanilla, no preprocessor)
- **State Management**: React Context API (Auth + MakeReadyBoard)

## Development Notes

- Port 5175 chosen to avoid conflict with Tech app (port 5173)
- Backend expected on port 4000 (configurable via .env)
- All users treated as Admin - no role restrictions enforced
- Components from Tech app mounted as-is with minimal path adjustments
- Future Electron integration ready (electron/ directory reserved)onent
- `MakeReadyBoard.ts` - Type definitions
- `MakeReadyBoard.css` - Board styles
- `MakeReadyTurnTechView.tsx` - Detail panel component
- `MakeReadyTurnTechView.css` - Detail panel styles

**Context Provider**: `MakeReadyBoardProvider` wrapped around app in `App.tsx`

**Dependencies**:
- `lucide-react` - Icon library (installed)
- `makeReady.ts` types (copied to `src/types/`)
- Environment variable: `VITE_API_URL`

**Modifications made**:
1. Import paths: Changed `@/types/makeReady` → `../../types/makeReady`
2. Import extension: Added `.tsx` to component import for TypeScript resolution

**API Integration**: Board fetches from `${VITE_API_URL}/api/make-ready-board`

### Compatibility Styles Added

Added to `src/styles/index.css`:

```css
/* Tech app compatibility classes */
.pf-page { /* ... */ }
.pf-page-header { /* ... */ }
.pf-page-title { /* ... */ }
.pf-page-subtitle { /* ... */ }
.pf-page-body { /* ... */ }
.page-root { /* ... */ }
.page-header { /* ... */ }
/* etc. */
```

These ensure Tech app components render correctly in Desktop app layout without modifying the component files.

## Validation Checklist

✅ Navigating to `/management/apartments` shows Inventory UI  
✅ Navigating to `/maintenance/make-ready` shows Make Ready Board UI  
✅ Sidebar navigation highlights correct section  
✅ Login gates access correctly  
✅ No duplicated UI or rewritten logic  
✅ Build succeeds with 0 TypeScript errors  
✅ Components render inside Desktop layout (sidebar visible)  
✅ Dark theme consistent throughout  
✅ No scrollbar conflicts  

## Future Integration Notes

### Make Ready Wizard

The Make Ready Wizard component exists in Tech app but is not yet integrated. To integrate:

1. Copy `Property Flow Tech/src/pages/MakeReadyWizard/` to Desktop
2. Add route (likely nested under `/maintenance/make-ready/wizard/:id`)
3. Update MakeReadyBoard to navigate to wizard route when creating/editing turns
4. Ensure wizard completion dispatches proper events for board refresh

### Apartment Detail View

Similar to wizard, the apartment detail view can be integrated when needed.

## TODO: Integration Tasks

1. ~~**Integrate Apartments Component**~~ ✅ COMPLETED
   - ~~File: `src/pages/Management/Apartments.tsx`~~
   - ~~Import existing Inventory component from Property Flow Tech~~

2. ~~**Integrate Make Ready Board**~~ ✅ COMPLETED
   - ~~File: `src/pages/Maintenance/MakeReady.tsx`~~
   - ~~Import existing MakeReadyBoard component from Property Flow Tech~~

3. **Connect to Backend** (Partially complete)
- ✅ Make Ready Board connected via VITE_API_URL
   - ⏳ Update AuthContext to call actual login API
   - ⏳ Implement proper error handling

4. **Add User Creation**
   - ⏳ Create user management page functionality
   - ⏳
3. **Connect to Backend**
   - Update AuthContext to call actual login API
   - Add API base URL configuration
   - Implement proper error handling

4. **Add User Creation**
   - Create user management page functionality
   - Add "Create Test User" button for development

## Design System

- **Dark Theme**: Navy gradient backgrounds (#0f1419 to #1a2332)
- **Primary Accent**: Blue (#5b9dd9)
- **Fonts**: Montserrat (headings), Nunito Sans (body)
- **Components**: Rounded corners (8-12px), consistent spacing, blue focus states

## Technologies

- **Frontend**: React 19 + TypeScript
- **Routing**: React Router DOM 7
- **Build Tool**: Vite 6
- **Desktop**: Electron 33
- **Styling**: CSS Modules / vanilla CSS
