# Implementation: Option 2 (Building Model) + Step 2 UI Updates
**Date**: December 12, 2025

## Summary

Implemented database schema upgrade (Option 2) with dedicated Building model and updated Make Ready Wizard Step 2 UI with equal-width form fields and dynamic dropdown integration.

---

## 1. Database Schema Changes

### Added Building Model

```prisma
model Building {
  id             Int        @id @default(autoincrement())
  propertyId     Int
  buildingNumber String     // e.g., "100", "101", "Building A"
  name           String?    // Optional friendly name
  floors         Int?
  unitsPerFloor  Int?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  property       Property   @relation(fields: [propertyId], references: [id])
  apartments     Apartment[]

  @@unique([propertyId, buildingNumber])
  @@index([propertyId])
}
```

### Updated Property Model
- Added `buildings` relation: `buildings Building[]`

### Updated Apartment Model
- Added `buildingId` foreign key to Building
- Added `buildingRel` relation
- Kept `building` string field for backwards compatibility
- Added composite index: `@@index([propertyId, buildingNumber])`

---

## 2. Step 2 (MakeReadyStepTurnDetails) UI Enhancements

### Layout Structure

All form fields now use **equal-width grid layout**:

```
┌─────────────────────────────────────────────┐
│  Building Dropdown  │  Apartment Dropdown   │
├─────────────────────────────────────────────┤
│  Turn Type Dropdown │  Priority Dropdown    │
├─────────────────────────────────────────────┤
│  Move-Out Date      │  Target Ready Date    │
├─────────────────────────────────────────────┤
│              Notes (Full Width)             │
└─────────────────────────────────────────────┘
```

### Key Features

1. **Building Dropdown**
   - Fetches from `/api/buildings` on component mount
   - Displays building name or number
   - Triggers apartment fetch when selected

2. **Apartment Dropdown (Conditional)**
   - Appears only after building is selected
   - Fetches from `/api/buildings/{buildingId}/apartments`
   - Displays unit number with bed/bath info
   - Same width as Building dropdown for balanced layout

3. **Equal-Width Fields**
   - All dropdowns, date inputs, and notes maintain consistent widths
   - Uses CSS Grid with `grid-template-columns: 1fr 1fr`
   - Responsive: stacks to single column on tablets (< 768px)

4. **Dynamic Loading & Error Handling**
   - Shows loading states during API calls
   - Displays error messages if API fails
   - Apartment dropdown disabled until building selected
   - Graceful fallback messages in disabled state

---

## 3. CSS Updates

Added new classes to both Desktop and Tech app stylesheets:

```css
/* Two-column equal-width row */
.wizard-row-equal {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

/* Full-width field for notes */
.wizard-field-full {
  grid-column: 1 / -1;
}

/* Error message styling */
.wizard-error { /* ... */ }

/* Disabled state handling */
.wizard-content select:disabled { /* ... */ }

/* Responsive design */
@media (max-width: 768px) {
  .wizard-row-equal {
    grid-template-columns: 1fr;
  }
}
```

---

## 4. API Integration

### Endpoint Requirements

Backend needs to provide:

1. **GET `/api/buildings`**
   - Returns: `Building[]`
   - Purpose: Populate building dropdown

2. **GET `/api/buildings/{buildingId}/apartments`**
   - Returns: `Apartment[]`
   - Purpose: Populate apartment dropdown based on selected building

### Implementation Notes

- Component reads `VITE_API_BASE_URL` from environment
- All requests include error handling with user feedback
- Apartment fetch is triggered only when building changes

---

## 5. Files Modified

### Backend
- **prisma/schema.prisma** - Added Building model, updated Property/Apartment relations

### Desktop App
- **src/pages/MakeReadyWizard/steps/MakeReadyStepTurnDetails.tsx** - Complete rewrite with:
  - Building/Apartment interfaces
  - useEffect hooks for API calls
  - State management for selected building
  - Equal-width form layout
  - Dynamic dropdown rendering

- **src/pages/MakeReadyWizard/MakeReadyWizard.css** - Added:
  - `.wizard-row-equal` class
  - `.wizard-field-full` class
  - `.wizard-error` class
  - Disabled state styles
  - Responsive breakpoint adjustments

### Tech App
- **src/pages/MakeReadyWizard/MakeReadyWizard.css** - Added same CSS classes for consistency

---

## 6. Migration Path (When Ready)

When you have buildings in the database:

1. **Create Building records** for each building (100-1700)
   ```sql
   INSERT INTO "Building" (propertyId, buildingNumber, name)
   VALUES (1, '100', 'Building 100'), (1, '101', 'Building 101'), ...
   ```

2. **Backfill Apartment records** with buildingId
   ```sql
   UPDATE "Apartment" 
   SET buildingId = (
     SELECT id FROM "Building" 
     WHERE "Building".buildingNumber = "Apartment".building
     AND "Building".propertyId = "Apartment".propertyId
   )
   ```

3. **Create backend endpoints** to serve building and apartment data

4. **Test** Step 2 wizard with live data

---

## 7. Build Status

✅ **TypeScript**: 0 errors  
✅ **Production Build**: 291.86 KB JS (87.73 KB gzipped), 53.18 KB CSS (10.22 KB gzipped)  
✅ **Build Time**: 1.30s

---

## 8. Next Steps

1. **Create migration** for Building table and Apartment.buildingId
2. **Seed database** with building records (100-1700)
3. **Implement backend endpoints**:
   - GET /api/buildings
   - GET /api/buildings/{buildingId}/apartments
4. **Test in browser** once API endpoints are ready
5. **Update test data** in waterford-units.json if needed

---

## Benefits of Option 2

✅ **Proper Data Isolation** - Building 100 in Property A ≠ Building 100 in Property B  
✅ **Scalability** - Can add building-specific metadata (capacity, amenities, etc.)  
✅ **Performance** - Direct queries without needing to extract unique values  
✅ **Data Integrity** - Building numbers are proper entities with validation  
✅ **UI Safety** - Less prone to cross-property data leaks  

