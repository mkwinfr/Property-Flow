# Make-Ready Punch List Integration Plan

## Current Flow
1. **Turn Creation** → Make Ready Wizard creates a Turn record (db: Turn model)
2. **Board Display** → Turn appears on Make Ready Board (MakeReadyBoard.tsx)
3. **Punch List Opening** → Click apartment on board → Opens punch list for that turn

## Data Model Analysis

### Turn Model (Prisma)
```
- id (Int)
- apartmentId (Int) - FK to Apartment
- unitId (Int) - Unit number/identifier
- type (TurnType) - STANDARD_MOVE_OUT, TRANSFER, etc.
- status (TurnStatus) - NOT_STARTED, IN_PROGRESS, READY, ON_HOLD
- priority (PriorityLevel)
- tasks (TurnTask[]) - Related punch items
- materials (TurnMaterial[])
- workCategories (TurnWorkCategory[])
- createdAt, updatedAt
```

### MakeReadyItem (Frontend)
```
- id (string) - Turn ID
- apartmentNumber (string)
- building (string | null)
- turnType (string)
- techName (string | null)
- priority (string)
- status (MakeReadyStatus)
- notes (string | null)
- dueDate (string | null)
- updatedAt (string | null)
```

## Integration Architecture

### Option 1: Punch List as Modal (RECOMMENDED)
- Keep Punch List in prototype folder initially
- Pass Turn ID to PunchListPage as prop
- Open PunchListPage in modal when item clicked
- Share useTemplateStore between prototype and main app
- **Pros**: Minimal changes, modal overlay keeps board visible
- **Cons**: Modal might feel constrained

### Option 2: Full Page Navigation
- Move PunchListPage to main Tech app
- Navigate to `/punch-list/:turnId`
- Back button returns to board
- **Pros**: Full screen real estate
- **Cons**: More navigation changes needed

## Implementation Steps

### Phase 1: Setup (Week 1)
1. **Copy Punch List Components to Tech App**
   - Copy `src/store/useTemplateStore.ts` → `src/store/useTemplateStore.ts`
   - Copy `src/components/PunchListPage.tsx` → `src/components/PunchListPage.tsx`
   - Copy `src/styles/punch-list-page.css` → `src/styles/punch-list-page.css`
   - Copy supporting components and data files

2. **Extract AdminPage as Separate Feature**
   - Keep AdminPage in prototype for template management
   - Link to it from settings in main app (or keep separate)
   - Document how to access admin panel

3. **Update useTemplateStore**
   - Add optional `turnId` parameter
   - Load turn-specific punch items from backend
   - Persist punch items to TurnTask table (instead of localStorage)

### Phase 2: Backend Integration (Week 1-2)
1. **Create API Endpoint**
   ```
   GET /api/turns/:turnId/punch-list
   POST /api/turns/:turnId/punch-items
   PATCH /api/turns/:turnId/punch-items/:itemId
   DELETE /api/turns/:turnId/punch-items/:itemId
   ```

2. **Database Schema Updates**
   - TurnTask already exists, map it to PunchItem
   - Add fields:
     - `status` (Open, In Progress, Completed, Not Applicable)
     - `notes` (string)
     - `assignedTo` (User FK)
     - `priority` (Medium, High, Low)
     - `completedAt` (DateTime)

3. **Update Prisma Schema**
   ```prisma
   model TurnTask {
     // existing fields
     id              Int    @id @default(autoincrement())
     turnId          Int
     templateKey     String? // Link to template item
     title           String
     category        String
     area            String
     
     // New fields for punch list
     status          String   @default("Open")
     notes           String?
     assignedToUserId Int?
     priority        String   @default("Medium")
     completedAt     DateTime?
     isCustom        Boolean  @default(false)
     
     turn            Turn     @relation(fields: [turnId], references: [id])
     assignedTo      User?    @relation(fields: [assignedToUserId], references: [id])
   }
   ```

### Phase 3: Frontend Integration (Week 2)
1. **Update MakeReadyBoard Component**
   - Add click handler to open punch list
   - Pass selectedTurnId to state/props
   - Show modal or navigate

2. **Create PunchListModal Wrapper**
   - Wraps PunchListPage
   - Takes `turnId` and `onClose` props
   - Shows in overlay

3. **Update App.tsx Routing**
   - Add route for punch list modal
   - Or handle modal state in MakeReadyBoard

4. **Update useTemplateStore**
   - Replace localStorage with API calls
   - Accept `turnId` parameter
   - Fetch template from backend based on floor plan
   - Fetch turn's punch items from backend
   - Sync updates to backend in real-time

### Phase 4: Testing (Week 2-3)
1. **Unit Tests**
   - useTemplateStore with turn data
   - PunchListPage with turn ID
   - API endpoints

2. **Integration Tests**
   - End-to-end: Create Turn → Board → Punch List
   - Verify data persistence
   - Test status updates

3. **Manual Testing**
   - Desktop app testing
   - Mobile/tablet responsive testing

## File Structure After Integration

```
Property Flow Tech/src/
├── components/
│   ├── PunchList/
│   │   ├── PunchListPage.tsx (moved from prototype)
│   │   ├── PunchListModal.tsx (new wrapper)
│   │   ├── EditPunchItemModal.tsx
│   │   ├── FilterPanel.tsx
│   │   └── PunchItemRow.tsx
│   ├── MakeReadyBoard/
│   │   ├── MakeReadyBoard.tsx (updated)
│   │   └── MakeReadyTurnTechView.tsx
│   └── AdminPage/ (optional, stays in prototype initially)
├── store/
│   ├── useTemplateStore.ts (moved from prototype, updated)
│   ├── usePunchListStore.ts (updated for API)
│   └── useMakeReadyStore.ts
├── styles/
│   ├── punch-list-page.css (moved from prototype)
│   └── punch-list-modal.css (new)
├── types/
│   └── punch-list.ts (shared types)
└── data/
    └── punchTemplates.ts (moved from prototype)
```

## Turn-Specific Punch List Implementation

### Template vs Turn Data
- **Template**: Canonical checklist items per floor plan (stored in prototype admin)
- **Turn Punch List**: Instance of template items for specific turn, with status/notes/assignments

### Data Flow
```
1. Turn created in wizard with floor plan selection
2. When punch list opened:
   a. Load floor plan template
   b. Fetch turn's punch items from /api/turns/:id/punch-list
   c. Merge: template items with their status/notes from turn items
   d. Display with edit capability
3. User updates item status:
   a. Save to /api/turns/:id/punch-items/:itemId
   b. Update local state
   c. Show save confirmation
4. Closing punch list:
   a. All changes auto-saved to backend
   b. Return to board
```

## API Responses Example

### GET /api/turns/:turnId/punch-list
```json
{
  "turnId": 1,
  "apartmentNumber": "610",
  "floorPlan": "Floor Plan B",
  "template": {
    "areas": [
      {
        "id": "master-bedroom",
        "name": "Master Bedroom",
        "categories": [...]
      }
    ]
  },
  "punchItems": [
    {
      "id": 5,
      "turnId": 1,
      "templateKey": "item-master-bed-ceiling-fan",
      "title": "Ceiling fan",
      "area": "Master Bedroom",
      "category": "Electrical",
      "status": "Open",
      "notes": "Check for wobbling",
      "assignedTo": { "id": 2, "name": "John" },
      "priority": "High",
      "completedAt": null
    }
  ]
}
```

## Deployment Considerations

1. **Backward Compatibility**
   - Old turns without punch items should still work
   - Generate template items on-demand if missing

2. **Data Migration**
   - Script to populate TurnTask for existing turns
   - Map apartment floor plan to turn

3. **Feature Flags**
   - Use feature flags to enable punch list gradually
   - Allow admin to choose between old/new system

4. **Performance**
   - Cache template data (rarely changes)
   - Paginate long punch lists
   - Use WebSocket for real-time sync (optional)

## Next Steps

1. Confirm integration approach (Modal vs Full Page)
2. Create backend API endpoints
3. Copy components to main Tech app
4. Update useTemplateStore for API
5. Update MakeReadyBoard to open punch list
6. Test end-to-end flow
