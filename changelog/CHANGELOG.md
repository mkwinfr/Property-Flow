# Changelog

All major releases and version updates for Property Flow.

## [Unreleased]

### Added
- **Building Model Implementation (Option 2)**
  - Building model in Prisma with propertyId, buildingNumber, name, floors, unitsPerFloor
  - Apartment model updated with buildingId foreign key
  - 17 buildings (100-1700) in database
  - 384 apartments with building associations
- **Backend API Endpoints**
  - GET `/api/buildings` - All buildings
  - GET `/api/buildings/:id` - Building with apartments
  - GET `/api/buildings/:id/apartments` - Apartments for building
- **Step 2 UI Redesign**
  - Dynamic Building dropdown (API-driven)
  - Conditional Apartment dropdown (appears after building selection)
  - Equal-width form layout using CSS Grid
  - Responsive design with mobile stacking
  - Error handling and loading states
- Global CSS synchronization between Property Suite Desktop and Property Flow Tech
- ApartmentDetail component integration for full apartment management UI
- Make Ready Wizard (10-step workflow) integration
- Changelog folder structure for version tracking
- Environment configuration (.env) for API base URL

### Changed
- `/management/apartments` now uses ApartmentDetail instead of Inventory placeholder
- Sidebar navigation now includes Make Ready Wizard link
- CSS styling now matches Property Flow Tech design system
- MakeReadyStepTurnDetails component rewritten with API integration
- Database schema regenerated to match current design

### Fixed
- Prisma seed script to include buildingId when creating apartments
- Import path issues in MakeReadyWizard components (@/ → relative paths)
- TypeScript unused parameter warnings
- Database migration mismatch between schema and existing migrations

### Database
- Fresh migration created: `20251213044459_init`
- Database seeded with full building/apartment data
- Sample turn data for units 101 and 205

## [Project Start - December 2025]

### Initial Setup
- Created Property Suite Desktop (React 19, Vite 6, TypeScript)
- Implemented authentication system with localStorage
- Built complete navigation structure (5 sections, 40+ routes)
- Integrated Make Ready Board from Tech app
- Created 27 placeholder pages
