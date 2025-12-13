# Integration Notes

Documentation for component integrations, API changes, and refactoring work.

## Component Integration Guide

### Make Ready Board Integration
- **Source**: `Property Flow Tech/src/pages/MakeReadyBoard/`
- **Destination**: `Property Flow Desktop/src/pages/MakeReadyBoard/`
- **Status**: ✅ Complete
- **Notes**: 
  - Requires MakeReadyBoardProvider context
  - Connected to backend at `${VITE_API_BASE_URL}/api/make-ready-board`
  - Uses lucide-react for icons

### ApartmentDetail Integration
- **Source**: `Property Flow Tech/src/pages/ApartmentDetail/`
- **Destination**: `Property Flow Desktop/src/pages/ApartmentDetail/`
- **Status**: ✅ Complete
- **Notes**:
  - Fetches apartments from `/api/apartments`
  - Fetches apartment details from `/api/apartments/{id}/detail`
  - Uses Tech app styling classes (.apartments-page, .apartment-card, etc.)

### Make Ready Wizard Integration
- **Source**: `Property Flow Tech/src/pages/MakeReadyWizard/`
- **Destination**: `Property Flow Desktop/src/pages/MakeReadyWizard/`
- **Status**: ✅ Complete
- **Notes**:
  - 10-step workflow with step components
  - Requires MakeReadyBoardProvider context
  - Uses useMakeReadyBoard hook for state management
  - All step components in `steps/` subdirectory

## CSS/Styling Integration

All style files copied from Tech app maintain consistency:

1. **tokens.css** - Design system variables
   - Colors: Navy, cream, coral, sky, purple, green, red
   - Size tokens, spacing scales

2. **base.css** - Foundation styles
   - Font imports (Montserrat, Nunito Sans)
   - HTML/body/root resets
   - App shell styles

3. **utilities.css** - Reusable utility classes
   - Page layout (.pf-page, .pf-page-header, .pf-page-body)
   - Cards (.pf-card, .pf-card-grid)
   - Pills/chips (.pf-pill, .pf-pill-success)
   - Meta labels (.pf-meta-label, .pf-meta-value)

4. **components.css** - Component-specific styles
   - Dock component styles
   - App drawer styles
   - Splash screen styles
   - Make ready cards and chips

5. **pages.css** - Page layouts
   - Apartments page (.apartments-page, .apartment-card)
   - Dashboard page (.dashboard-root, .dashboard-card)
   - Make ready board (.make-ready-root, .make-ready-card)

6. **animations.css** - Keyframe animations
   - Fade in, slide transitions
   - Logo animations
   - Loading bar animation

## Import Path Corrections

When integrating components with `@/` imports:

**Pattern**: `@/path/to/module` → `relative/path/to/module`

**Examples**:
- `@/types/makeReady` (from steps/) → `../../../types/makeReady`
- `@/hooks/useMakeReadyBoard` → `../../hooks/useMakeReadyBoard`
- `@/types/makeReady` (from main wizard) → `../../types/makeReady`

## API Endpoints Used

### Make Ready Board
- **GET** `/api/make-ready-board` - Fetch all turns with units/buildings

### Apartments
- **GET** `/api/apartments` - Fetch all apartments
- **GET** `/api/apartments/{id}/detail` - Fetch apartment details (turns, work orders, etc.)

All endpoints expect `VITE_API_BASE_URL` environment variable (default: `http://localhost:4000`)

## Future Integration Considerations

1. **MakeReadyWizard Routing**: Consider nested routing for wizard completion flows
2. **Apartment Detail Panel**: Could open in modal or side panel instead of full page
3. **Custom Hooks**: Consider centralizing wizard state management
4. **Error Handling**: Implement consistent error boundaries for integrated components
