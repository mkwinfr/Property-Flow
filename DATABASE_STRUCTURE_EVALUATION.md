# Database Structure Evaluation - Property Flow

**Date:** December 22, 2025  
**Status:** Comprehensive Review Complete

---

## Executive Summary

Your database schema is **well-architected for current needs** with strong fundamentals, but has several opportunities for optimization and clarification that would improve maintainability, query performance, and data integrity. The structure supports your complex make-ready workflow, but some fields are redundantly distributed across models.

**Overall Assessment: 7.5/10** ✅ Solid foundation with room for improvement

---

## Strengths ✅

### 1. **Comprehensive Enum System**
- Well-defined status enums (TurnStatus, WorkOrderStatus, PunchListItemStatus, etc.)
- Consistent naming (SCREAMING_SNAKE_CASE)
- Prevents invalid state values at database level
- Clear lifecycle transitions documented

### 2. **Activity Audit Trail**
- `TurnActivityLog` captures every significant action
- `AuditLog` for system-level changes
- JSON details field for flexible metadata
- Proper timestamps and user tracking
- Excellent for compliance and debugging

### 3. **Flexible Role-Based Access Control (RBAC)**
- Department → Role → Permission hierarchy is clean
- `RolePermission` junction table allows granular control
- `UserProperty` junction enables multi-property access
- Scalable for complex org structures

### 4. **Inventory & Cost Tracking**
- `InventoryItem` + `PunchItemInventoryUsage` junction enables:
  - Multi-part punch items
  - Cost snapshots at time of usage
  - Manager override capability
  - Quantity tracking per usage
- `TurnCostBreakdown` aggregates labor + materials + vendor costs

### 5. **Proper Relationships**
- Foreign key constraints with cascading deletes where appropriate
- `include` patterns in queries properly fetch related data
- Logical entity groupings (Building contains Apartments, etc.)

---

## Issues & Concerns ⚠️

### 1. **Problematic Field Redundancy - HIGH PRIORITY**

**The Turn model has conflicting/redundant fields:**

```typescript
// These are CONFUSING and potentially out-of-sync:
turnNotes          // "General notes"
notes              // Another notes field?
photoNotes         // Only for photos?
managerReviewNotes // Only for reviews?
lifeSafetyNotes    // Only for safety?
accessInstructions // Actually access info, not notes
```

**Problem:** Code like this exists in turns.ts:
```typescript
data: {
  turnNotes,      // User submitted
  notes,          // Where does this come from?
  // ...
}
```

**Impact:**
- Frontend developers don't know which field to use
- Data gets scattered across multiple fields
- Potential for losing information
- Increases query complexity

**Recommendation:** Consolidate into a single structured approach:

```typescript
// Option A: Single notes field with timestamps
notes {
  content: string
  createdAt: DateTime
  createdBy: Int (userId)
  type: "GENERAL" | "PHOTO" | "SAFETY" | "MANAGER" | "ACCESS"  // Use enum
}

// Option B: Typed comment system (cleaner)
model TurnNote {
  id          Int
  turnId      Int
  type        TurnNoteType  // enum for safety, photo, access, etc.
  content     String
  createdByUserId Int
  createdAt   DateTime
  
  turn        Turn @relation(...)
  createdBy   User @relation(...)
}

// Option C (MINIMAL - recommended): 
// Keep ONLY: notes (general), managerReviewNotes (manager feedback)
// Remove: photoNotes, lifeSafetyNotes, wallsCondition details, etc.
// → Move condition fields to separate model (see below)
```

---

### 2. **Condition Assessment Is Scattered - HIGH PRIORITY**

**Current structure:**
```typescript
overallCondition        // OverallCondition enum
wallsCondition          // String (inconsistent!)
flooringCondition       // String (inconsistent!)
doorsLocksCondition     // String (inconsistent!)
plumbingCondition       // String (inconsistent!)
electricalCondition     // String (inconsistent!)
appliancesCondition     // String (inconsistent!)
cleanlinessCondition    // String (inconsistent!)
hasLifeSafetyIssues     // Boolean
lifeSafetyNotes         // String
```

**Problems:**
- 7+ condition fields cluttering Turn model
- Mixed types (enum vs string vs boolean) = type safety issues
- Difficult to query/report on conditions
- No standardized condition levels for specific areas
- Mobile app can't easily display/edit conditions

**Recommendation:** Extract to dedicated model:

```typescript
model TurnConditionAssessment {
  id              Int @id @default(autoincrement())
  turnId          Int @unique
  
  // Use consistent enum for all areas
  overall         OverallCondition
  walls           ConditionLevel       // NEW enum: EXCELLENT|GOOD|FAIR|POOR|SEVERE
  flooring        ConditionLevel
  doorsLocks      ConditionLevel
  plumbing        ConditionLevel
  electrical      ConditionLevel
  appliances      ConditionLevel
  cleanliness     ConditionLevel
  
  hasLifeSafetyIssues Boolean @default(false)
  lifeSafetyNotes     String?
  assessedByUserId    Int
  assessedAt          DateTime @default(now())
  
  turn            Turn @relation(fields: [turnId], references: [id], onDelete: Cascade)
  assessedBy      User @relation(fields: [assessedByUserId], references: [id])
  
  @@index([turnId])
}

enum ConditionLevel {
  EXCELLENT
  GOOD
  FAIR
  POOR
  SEVERE
}
```

**Benefits:**
- Turn model stays focused on turn properties
- Conditions versioned (assessment history)
- Consistent type system
- Easy to add new assessment areas
- Frontend can iterate condition fields without modifying Turn

---

### 3. **Apartment Has Denormalized Data - MEDIUM PRIORITY**

```typescript
model Apartment {
  // These come from FloorPlan but are stored here too:
  beds         Int?          // Duplicated from floorPlan.bedrooms
  baths        Int?          // Duplicated from floorPlan.bathrooms
  sqFt         Int?          // Duplicated from floorPlan.sqFt
  
  // These are CSV imports (denormalized):
  building     String?       // Duplicated from building.buildingNumber
  property     String?       // Duplicated from property.name
  
  // These are from rent rules elsewhere:
  minRent      Float?
  maxRent      Float?
}
```

**Problem:** 
- If FloorPlan updates, Apartment data becomes stale
- "property" name changes break apartment records
- Unnecessary data duplication

**Recommendation:**

```typescript
// Remove these from Apartment:
// - beds, baths, sqFt (query floorPlan instead)
// - building, property (query relations instead)
// - minRent, maxRent (belongs in RentSchedule model)

// When you need apartment with bed/bath:
const apartment = await prisma.apartment.findUnique({
  where: { id },
  include: { 
    floorPlan: true,      // Get beds/baths from here
    propertyRel: true,    // Get property name from here
    buildingRel: true     // Get building number from here
  }
});

// If rent varies per apartment (not just per floor plan), 
// create separate model:
model ApartmentRent {
  id           Int
  apartmentId  Int @unique
  minRent      Float
  maxRent      Float
  effectiveDate DateTime
  notes        String?
  
  apartment    Apartment @relation(...)
}
```

---

### 4. **User Model Mixing Legacy & New Patterns - MEDIUM PRIORITY**

```typescript
model User {
  roleId         Int?        // New pattern: role-based
  userRole       UserRole    // OLD pattern: enum directly
  
  // Both co-exist but should use only roleId + Role.key
}
```

**Problem:**
- Code path confusion (which to use?)
- Potential for sync issues
- Harder to manage permissions

**Recommendation:**
```typescript
// Remove the comment about legacy field, actually clean it up:
// 1. Migrate all existing users to roleId
// 2. Remove userRole field
// 3. Update queries to use role.key

// Query pattern:
const user = await prisma.user.findUnique({
  where: { id },
  include: { 
    role: {
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    }
  }
});

// For permission checks:
const hasPermission = user.role.permissions
  .some(rp => rp.permission.key === 'MAINTENANCE_WORKORDERS_UPDATE');
```

---

### 5. **Work Order & Turn Relationship is Blurry - MEDIUM PRIORITY**

```typescript
model WorkOrder {
  apartmentId      Int
  turnId           Int?       // Optional - when is it set? When is it not?
  type             WorkOrderType  // Can be MAKE_READY or others
  
  // Questions:
  // - Is a WorkOrder the same as a TurnTask?
  // - When should turnId be set?
  // - Can one WorkOrder map to multiple turns?
  // - Why both systems?
}

model TurnTask {
  turnId           Int
  title            String
  // A task within a turn
}
```

**Problem:**
- Unclear when to use WorkOrder vs TurnTask
- Potential for duplicate work entries
- API routes handle both separately
- Code in turns.ts creates TurnTasks, not WorkOrders

**Recommendation:** Document & enforce clear boundaries:

```typescript
// WorkOrder = broader maintenance system, can exist independently
// TurnTask = specific work within a make-ready turn

// Clear usage:
// 1. Technician creates Turn → Auto-creates TurnTasks from punch template
// 2. TurnTasks capture punch list items and custom work
// 3. If TurnTask needs vendor, link via TurnTask.vendorId
// 4. WorkOrder = optional, for cross-cutting maintenance not in punch
// 5. For clarity, rename TurnTask to something more specific:
//    - PunchTask / TurnWorkItem / TurnWorkTask

// OR consider consolidating if 90% of your workflow uses TurnTask
```

---

### 6. **FloorPlan Denormalization Opportunity - LOW PRIORITY**

```typescript
model FloorPlan {
  name            String @unique      // "A1", "A1.2", "A1-P"
  type            String              // "Aspen", "Hickory" - why stored here?
  bedrooms        Int
  bathrooms       Float
  marketRent      Float
  requiredDeposit Float
  sqFt            Int
  maxOccupancy    Int
}
```

**Observation:** `type` (Aspen, Hickory) seems to be a naming convention, not functional data. Consider if this belongs in FloorPlan or if it should be extracted to:

```typescript
model FloorPlanType {
  id        Int @id
  name      String  // Aspen, Hickory, etc.
  // Plus base configuration
}
```

This would prevent accidental type misspellings and enable type-level policies.

---

### 7. **Missing Indexes for Common Queries - MEDIUM PRIORITY**

Current schema has good indexes on:
- ✅ apartmentId, status, priority on Turn
- ✅ turnId on PunchListItem
- ✅ userId on User, Vendor relationships

**Should add:**
```prisma
model Turn {
  @@index([createdByUserId])          // Find turns by technician
  @@index([reviewedByUserId])          // Find reviewed turns
  @@index([status, targetReadyDate])   // Make-ready board queries
}

model Apartment {
  @@index([status])                    // Filter by occupancy
  @@index([status, propertyId])        // Multi-property queries
}

model PunchListItem {
  @@index([status, turnId])            // Find open items
  @@index([assignedToUserId])          // Find assigned items
}

model Vendor {
  @@index([status])                    // Find active vendors
  @@index([specialties])               // Would need constraint extension
}

model TurnActivityLog {
  @@index([turnId, createdAt])         // Recent activity queries
  @@index([userId])                    // User activity history
}
```

---

### 8. **Vendor Assignment Model Could Be Clearer - LOW PRIORITY**

```typescript
// In TurnTask:
vendorId        Int?
assigneeType    String?    // "IN_HOUSE" or "VENDOR" - should be enum

// In Vendor:
specialties     String[]   // ["PAINTING", "PLUMBING"] - could be enum array
```

**Recommendation:**
```typescript
enum AssigneeType {
  IN_HOUSE
  VENDOR
}

enum VendorSpecialty {
  PAINTING
  PLUMBING
  ELECTRICAL
  // etc - use enums to prevent misspellings
}

model TurnTask {
  assigneeType    AssigneeType?  // Instead of String?
  
  // If assigneeType == VENDOR, then vendorId must be set
  // Add constraint in service layer or DB trigger
}

model Vendor {
  specialties     VendorSpecialty[]  // Type-safe array
}
```

---

## Data Integrity Concerns 🔒

### 1. **No Constraints on Conditional Required Fields**
```typescript
// If assigneeType = "VENDOR", vendorId MUST be set
// But database doesn't enforce this
// Can lead to orphaned records
```

**Fix:** Add constraints in backend service layer:
```typescript
if (task.assigneeType === 'VENDOR' && !task.vendorId) {
  throw new Error('Vendor ID required when assignee type is VENDOR');
}
```

### 2. **Cost Tracking Could Have Integrity Issues**
```typescript
model TurnCostBreakdown {
  laborCost          Float @default(0)
  materialsCost      Float @default(0)
  vendorServicesCost Float @default(0)
  totalCost          Float @default(0)
  
  // What if materials cost changes after totalCost is calculated?
  // Is totalCost kept in sync?
}
```

**Recommendation:** Consider making `totalCost` a computed field or add a recalculation trigger.

---

## Query Performance Observations 📊

### Current Queries Are Heavy:
```typescript
// From makeReadyBoard.ts
const turns = await prisma.turn.findMany({
  include: {
    apartment: true,
    punchListItems: {
      orderBy: { createdAt: 'asc' }  // Good, explicit ordering
    }
  }
  // ✅ Uses indexes effectively for make-ready board
});

// From turns.ts - Creating a turn with nested data:
const turn = await prisma.turn.create({
  data: {
    // ... 40+ fields ...
    conditionTags: { create: [...] },
    workCategories: { create: [...] },
    punchListItems: { create: [...] },
    tasks: { create: [...] },
    materials: { create: [...] }
  }
});
// ✅ Efficient single operation, good use of nested creates
```

**Potential Issue:** Turn creation does many nested creates. If one fails, entire transaction rolls back (good), but consider extracting condition assessment to separate step if assessment data arrives separately.

---

## Recommendations by Priority

### 🔴 **HIGH PRIORITY (Breaking/High Impact)**

1. **Consolidate Turn Notes** - Reduce 5+ note fields to 1-2 with types
2. **Extract Condition Assessment** - Move walls/flooring/etc to separate model
3. **Remove Apartment Denormalization** - Stop duplicating floor plan data
4. **Clean Up User Model** - Remove legacy userRole field, use roleId only

### 🟡 **MEDIUM PRIORITY (Quality of Life)**

5. **Add Missing Indexes** - createdByUserId, status+targetReadyDate, etc.
6. **Clarify WorkOrder vs TurnTask** - Document when to use each, consider renaming
7. **Fix Data Integrity** - Add service-layer constraints for conditional requirements
8. **Standardize Enum Usage** - Use enums for assigneeType, specialties, etc.

### 🟢 **LOW PRIORITY (Nice to Have)**

9. **Review FloorPlan Type** - Consider extracting Type to separate model
10. **Vendor Specialties** - Use enum array instead of strings
11. **Cost Breakdown** - Clarify if totalCost is computed or manually maintained

---

## Implementation Order

```
Week 1: HIGH PRIORITY
├── Remove duplicate notes fields, implement TurnNote model (or consolidate)
├── Extract TurnConditionAssessment model
├── Migrate existing data
└── Update API endpoints + frontend types

Week 2: MEDIUM PRIORITY
├── Add missing database indexes
├── Remove apartment denormalization (beds, baths, property, building)
├── Clean up userRole → roleId migration
├── Add enum types for assigneeType, specialties
└── Add service-layer validations

Week 3: CLEANUP + TESTING
├── Update all route handlers for new structure
├── Add integration tests
├── Update API documentation
└── Deploy and verify

```

---

## Migration Strategy

Since you have existing data:

```sql
-- Example: Extract condition assessment
ALTER TABLE "Turn" ADD COLUMN "temp_overall" TEXT;
UPDATE "Turn" SET "temp_overall" = "overallCondition";

-- Create new TurnConditionAssessment table via Prisma migration
npx prisma migrate dev --name extract_condition_assessment

-- Migrate data
INSERT INTO "TurnConditionAssessment" (...)
SELECT id, ... FROM "Turn" WHERE overallCondition IS NOT NULL;

-- Drop old columns
ALTER TABLE "Turn" DROP COLUMN overallCondition, wallsCondition, ...;
```

**Use Prisma migrations:**
```bash
# For each change, run:
npx prisma migrate dev --name descriptive_name

# This ensures safety and creates rollback capability
```

---

## Conclusion

Your database is **production-ready** but would benefit significantly from:

1. **Structural cleanup** - Notes and conditions consolidation
2. **Denormalization removal** - Stop duplicating floor plan data in apartments  
3. **Type safety improvements** - Use enums more consistently
4. **Performance tuning** - Add strategic indexes
5. **Data integrity** - Explicit constraints and validations

These changes are **backward compatible** if done via Prisma migrations and you'll significantly improve code maintainability, reduce bugs, and improve query performance.

The biggest wins would come from **consolidating the Turn notes fields** and **extracting condition assessment**—these two changes alone would make the schema much clearer to new developers and reduce silent data inconsistencies.

---

**Next Steps:**
1. Review this evaluation with your team
2. Prioritize which changes to tackle first
3. Create Prisma migrations for each change
4. Update type definitions in frontend
5. Refactor API routes to use new structure
