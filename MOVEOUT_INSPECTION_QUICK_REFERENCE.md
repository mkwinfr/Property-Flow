# Moveout Inspection Wizard - Quick Reference

## 🚀 Quick Start

### Backend Setup
```bash
cd "Property Flow Backend"

# Add migration for new tables
npm run prisma:migrate -- --name add_moveout_inspection
npm run prisma:generate

# Restart dev server
npm run dev
```

### Frontend - No Additional Setup
The wizard is automatically integrated. Just navigate to **"Moveout Inspection"** in the dock.

---

## 📂 File Structure

```
Property Flow Tech/src/pages/MoveoutInspectionWizard/
├── MoveoutInspectionWizard.tsx         # Main wizard component (7 steps)
├── MoveoutInspectionWizard.css         # All styling (dark theme)
├── components/
│   └── MoveoutInspectionRoom.tsx       # Room-by-room inspection UI
└── steps/
    ├── MoveoutInspectionStepStart.tsx              # 1. Property/Unit selection
    ├── MoveoutInspectionStepUnitOverview.tsx       # 2. Pre-inspection checklist
    ├── MoveoutInspectionStepInspection.tsx         # 3. Room-by-room inspection
    ├── MoveoutInspectionStepFindingsReview.tsx     # 4. Findings summary
    ├── MoveoutInspectionStepChargesSummary.tsx     # 5. Proposed charges
    ├── MoveoutInspectionStepGenerateWork.tsx       # 6. Work preview
    └── MoveoutInspectionStepComplete.tsx           # 7. Finalize & lock

Property Flow Tech/src/
├── types/moveoutInspection.ts                     # Type definitions
├── data/moveoutInspectionTemplate.ts              # Template converter

Property Flow Backend/
├── prisma/schema.prisma                           # Updated: +4 models
├── src/
│   ├── index.ts                                   # Updated: +route registration
│   └── routes/moveoutInspection.ts                # API endpoints (11 routes)
```

---

## 🔌 API Endpoints

### Core CRUD
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/moveout-inspections` | Create draft inspection |
| GET | `/api/moveout-inspections/:id` | Fetch inspection + all data |
| PATCH | `/api/moveout-inspections/:id/items` | Upsert items (bulk) |
| PATCH | `/api/moveout-inspections/:id/items/:itemId` | Update single item |

### Media
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/moveout-inspections/:id/media` | Add photo/video |
| DELETE | `/api/moveout-inspections/:id/media/:mediaId` | Remove media |

### Charges
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/moveout-inspections/:id/charges` | Generate charges from findings |
| PATCH | `/api/moveout-inspections/:id/charges/:chargeId` | Edit charge |

### Workflow
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/moveout-inspections/:id/generate-work` | Preview work tasks |
| PATCH | `/api/moveout-inspections/:id/complete` | Mark completed |
| PATCH | `/api/moveout-inspections/:id/lock` | Lock (read-only) |

---

## 💾 Database Models

### MoveoutInspection
```prisma
model MoveoutInspection {
  id                Int
  propertyId        Int
  apartmentId       Int?
  inspectionType    MoveoutInspectionType    // PRE_MOVEOUT, FINAL, OTHER
  status            MoveoutInspectionStatus  // DRAFT, COMPLETED, LOCKED
  inspectorUserId   Int?
  inspectionDate    DateTime
  notes             String?
  
  items             MoveoutInspectionItem[]
  charges           MoveoutChargeLineItem[]
  media             MoveoutInspectionMedia[]
}
```

### MoveoutInspectionItem
```prisma
model MoveoutInspectionItem {
  id              Int
  inspectionId    Int
  
  templateKey     String?                    // "master-bed-carpet"
  roomKey         String                     // "master-bedroom"
  categoryKey     String                     // "flooring"
  itemKey         String                     // "carpet"
  itemLabel       String                     // Display name
  
  conditionStatus MoveoutConditionStatus     // OK, WEAR, DAMAGE, MISSING, NOT_INSPECTED
  responsibility  MoveoutResponsibility      // OWNER, TENANT, UNSURE
  notes           String?
  costEstimate    Float?
  severity        Int?                       // 1-5
  
  media           MoveoutInspectionMedia[]
  charges         MoveoutChargeLineItem[]
}
```

### MoveoutChargeLineItem
```prisma
model MoveoutChargeLineItem {
  id              Int
  inspectionId    Int
  itemId          Int?                       // Optional: may not map to item
  
  description     String
  amount          Float
  status          MoveoutChargeStatus        // PROPOSED, APPROVED, REMOVED
}
```

### MoveoutInspectionMedia
```prisma
model MoveoutInspectionMedia {
  id              Int
  itemId          Int
  inspectionId    Int?
  
  mediaType       MoveoutMediaType           // PHOTO, VIDEO, OTHER
  uri             String                     // File path/URL
  caption         String?
}
```

---

## 🎮 Condition States & Defaults

| State | Responsibility | Creates Charge? | Use Case |
|-------|---|---|---|
| **OK** | Owner | ❌ | Item is in good condition |
| **Wear** | Owner | ❌ | Normal wear and tear |
| **Damage** | **Tenant** ✓ | ✅ | Damage beyond normal wear |
| **Missing** | **Tenant** ✓ | ✅ | Item is missing/absent |
| **Not Inspected** | Unsure | ❌ | Item not yet assessed (default) |

**Rule:** If responsibility = TENANT, a charge candidate is created in step 5.

---

## 🔄 Step-by-Step Flow

```
┌─────────────────────────────────────────────────┐
│ 1. START                                         │
│ Select property, unit, inspection type, date    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 2. UNIT OVERVIEW                                │
│ Checklist: keys returned, utilities, detectors  │
│ General unit notes                              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 3. INSPECTION (Template-driven)                 │
│ Room sidebar → Items by category                │
│ Per-item: condition, notes, cost, media         │
│ Can mark all OK in room or individually         │
│ Save draft at any time                          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 4. FINDINGS REVIEW                              │
│ Shows only: WEAR, DAMAGE, MISSING items         │
│ Grouped: Charge candidates | Maintenance items  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 5. CHARGES SUMMARY                              │
│ Auto-generate charges from DAMAGE/MISSING       │
│ Edit descriptions, amounts, status              │
│ Shows total proposed charges                    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 6. GENERATE WORK                                │
│ Preview tasks that will be created              │
│ Shows room, item, condition, notes              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 7. COMPLETE                                     │
│ Finalize (status → COMPLETED)                   │
│ Optional: Lock (status → LOCKED, read-only)     │
│ Back to dashboard                               │
└─────────────────────────────────────────────────┘
```

---

## 📝 Component Props

### MoveoutInspectionWizard (Main)
```typescript
props: {
  wizardState: MoveoutInspectionWizardState
  onDraftUpdate: (updates: Partial<MoveoutInspectionDraft>) => void
  onItemsUpdate: (items: MoveoutInspectionItemState[]) => void
  onChargesUpdate: (charges: MoveoutChargeLineItem[]) => void
  onNext: () => void
  onPrevious: () => void
  onSaveDraft: () => Promise<void>
  onFinalize: () => Promise<void>
  isSubmitting: boolean
}
```

### MoveoutInspectionRoom
```typescript
props: {
  roomKey: string
  items: MoveoutInspectionItemState[]
  onItemUpdate: (itemIndex: number, updates: Partial<MoveoutInspectionItemState>) => void
  onApplyToAll: (value: string) => void
  isSubmitting: boolean
}
```

---

## 🎨 Styling Classes

### Key CSS Classes
- `.moveout-inspection-wizard` - Root container
- `.wizard-step-*` - Step-specific styles
- `.inspection-item` - Individual item card
- `.condition-btn` - Condition state button
- `.finding-card` - Findings display card
- `.charge-item` - Charge line item
- `.room-btn` - Room sidebar button

### Color Coding
- **OK:** Green (`--pf-green`)
- **Wear:** Orange (`--pf-orange`)
- **Damage:** Red/Coral (`--pf-coral` / `--pf-red`)
- **Missing:** Red (`--pf-red`)
- **Primary:** Sky Blue (`--pf-sky`)

---

## 🚨 Common Issues & Solutions

### Issue: Steps not rendering
**Solution:** Ensure all step imports are correct in main wizard component. Check file paths.

### Issue: Items not auto-seeding
**Solution:** Template conversion in `getTemplateItemsByRoom()` may have incorrect keys. Check `templateKey` generation.

### Issue: Charges not generating
**Solution:** Verify items have `responsibility: 'TENANT'` AND status is `DAMAGE` or `MISSING`.

### Issue: Items not persisting
**Solution:** Call `onSaveDraft()` after updates. Ensure `inspectionId` is set before upserting items.

### Issue: Form inputs not updating
**Solution:** Verify `onItemUpdate()` callback is called with correct `itemIndex`. Check item state shallow copy.

---

## ✨ Future Enhancement Ideas

1. **Photo Upload:** Replace placeholder URI with actual file upload to S3/Cloudinary
2. **Work Creation:** Implement actual TurnTask/WorkOrder creation
3. **Signatures:** Add digital signature capture for inspector
4. **QR Codes:** Scan QR codes for quick navigation between units
5. **Offline Support:** IndexedDB sync for offline inspection data
6. **Reports:** PDF export with findings, charges, photos
7. **Tenant Portal:** Allow tenant to dispute charges
8. **Multi-Inspector:** Track multiple inspectors per inspection
9. **Mobile App:** Native app for iOS/Android

---

## 🧪 Testing Endpoints

### Create Inspection
```bash
curl -X POST http://localhost:4000/api/moveout-inspections \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": 1,
    "apartmentId": 5,
    "inspectionType": "FINAL",
    "inspectionDate": "2025-12-22T00:00:00Z",
    "notes": "Initial notes"
  }'
```

### Get Inspection
```bash
curl http://localhost:4000/api/moveout-inspections/1
```

### Update Items
```bash
curl -X PATCH http://localhost:4000/api/moveout-inspections/1/items \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "templateKey": "master-bed-carpet",
        "roomKey": "master-bedroom",
        "categoryKey": "flooring",
        "itemKey": "carpet",
        "itemLabel": "Carpet",
        "conditionStatus": "DAMAGE",
        "responsibility": "TENANT",
        "notes": "Stain",
        "costEstimate": 500
      }
    ]
  }'
```

---

## 📚 Related Files

- [DATABASE_STRUCTURE_EVALUATION.md](DATABASE_STRUCTURE_EVALUATION.md) - Overall DB schema review
- [DATABASE_IMPROVEMENTS_ROADMAP.md](DATABASE_IMPROVEMENTS_ROADMAP.md) - Future DB enhancements
- [MOVEOUT_INSPECTION_WIZARD_IMPLEMENTATION.md](MOVEOUT_INSPECTION_WIZARD_IMPLEMENTATION.md) - Full implementation details

---

**Last Updated:** December 22, 2025  
**Status:** ✅ Complete & Ready for Testing
