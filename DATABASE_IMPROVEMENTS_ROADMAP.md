# Database Structure Improvements - Roadmap

**Created:** December 22, 2025  
**Status:** Planned  
**Associated Document:** [DATABASE_STRUCTURE_EVALUATION.md](DATABASE_STRUCTURE_EVALUATION.md)

---

## Overview

This roadmap tracks the implementation of database structure improvements identified in the comprehensive evaluation. Changes are organized by priority and can be tackled independently or as a group.

---

## 🔴 HIGH PRIORITY - Phase 1

### Task 1.1: Consolidate Turn Notes Fields
**Status:** ⬜ Not Started  
**Effort:** 4-6 hours  
**Breaking Changes:** No (backward compatible via migration)

**Current Problem:**
- Turn model has: `turnNotes`, `notes`, `photoNotes`, `managerReviewNotes`, `lifeSafetyNotes`
- Inconsistent usage across routes and components
- Difficult for developers to know which field to use

**Implementation:**
- [ ] Design final notes structure (consolidated field vs TurnNote model)
- [ ] Create Prisma migration to add new structure
- [ ] Migrate existing data from scattered fields
- [ ] Update [src/routes/turns.ts](Property%20Flow%20Backend/src/routes/turns.ts) to use new fields
- [ ] Update frontend types in [src/types/makeReady.ts](Property%20Flow%20Tech/src/types/makeReady.ts)
- [ ] Update TurnModal component to use new fields
- [ ] Test data integrity in migration

**Files to Update:**
- prisma/schema.prisma
- Property Flow Backend/src/routes/turns.ts
- Property Flow Tech/src/types/makeReady.ts
- Property Flow Tech/src/components/TurnModal/TurnModal.tsx

---

### Task 1.2: Extract Condition Assessment Model
**Status:** ⬜ Not Started  
**Effort:** 6-8 hours  
**Breaking Changes:** No (backward compatible via migration)

**Current Problem:**
- 7+ condition fields cluttering Turn model (wallsCondition, flooringCondition, etc.)
- Mixed types (enum vs string vs boolean)
- Difficult to query/report on conditions
- Condition assessment logic scattered

**Implementation:**
- [ ] Create `TurnConditionAssessment` model with consistent ConditionLevel enum
- [ ] Create Prisma migration to add new table
- [ ] Migrate existing data from Turn to TurnConditionAssessment
- [ ] Remove old condition fields from Turn model
- [ ] Update [src/routes/turns.ts](Property%20Flow%20Backend/src/routes/turns.ts) to use new model
- [ ] Update API endpoints to fetch/update assessment
- [ ] Update frontend components to display new structure
- [ ] Add assessedByUserId and assessedAt for audit trail

**Files to Update:**
- prisma/schema.prisma
- Property Flow Backend/src/routes/turns.ts
- Property Flow Tech/src/types/makeReady.ts
- Property Flow Tech/src/components/TurnModal/tabs/MoveOutInspectionTab.tsx

---

### Task 1.3: Remove Apartment Denormalization
**Status:** ⬜ Not Started  
**Effort:** 3-4 hours  
**Breaking Changes:** No (queries updated to use relations)

**Current Problem:**
- Apartment stores `beds`, `baths`, `sqFt` duplicated from FloorPlan
- Apartment stores `building`, `property` names duplicated from relations
- If FloorPlan updates, Apartment becomes stale
- Data sync issues

**Implementation:**
- [ ] Identify all queries using apartment.beds/baths/sqFt
- [ ] Update queries to include floorPlan relation instead
- [ ] Create migration to remove columns: beds, baths, sqFt, building, property
- [ ] Update [src/routes/apartments.ts](Property%20Flow%20Backend/src/routes/apartments.ts) 
- [ ] Update [src/routes/makeReadyBoard.ts](Property%20Flow%20Backend/src/routes/makeReadyBoard.ts)
- [ ] Remove minRent/maxRent if not apartment-specific (move to RentSchedule if needed)
- [ ] Test all apartment queries return correct data

**Files to Update:**
- prisma/schema.prisma
- Property Flow Backend/src/routes/apartments.ts
- Property Flow Backend/src/routes/makeReadyBoard.ts
- Property Flow Backend/src/routes/buildings.ts
- Frontend components using apartment.beds/baths

---

## 🟡 MEDIUM PRIORITY - Phase 2

### Task 2.1: Clean Up User Model (Remove Legacy Field)
**Status:** ⬜ Not Started  
**Effort:** 2-3 hours  
**Breaking Changes:** No (if all users already have roleId)

**Current Problem:**
- User model has both `roleId` (new) and `userRole` enum (old)
- Code confusion about which to use
- Potential for sync issues

**Implementation:**
- [ ] Audit User table to confirm all users have roleId set
- [ ] Update any queries still using userRole enum
- [ ] Create migration to remove userRole field
- [ ] Update permission checking to use role.permissions
- [ ] Test RBAC still works correctly

**Files to Update:**
- prisma/schema.prisma
- Property Flow Backend/src/utils/permissions.ts
- Property Flow Backend/src/routes/admin/users.ts

---

### Task 2.2: Add Missing Database Indexes
**Status:** ⬜ Not Started  
**Effort:** 1-2 hours  
**Breaking Changes:** No (only improves performance)

**Indexes to Add:**
- Turn.createdByUserId (find turns by technician)
- Turn.reviewedByUserId (find reviewed turns)
- Turn(status, targetReadyDate) (make-ready board queries)
- Apartment.status (filter by occupancy)
- Apartment(status, propertyId) (multi-property queries)
- PunchListItem(status, turnId) (find open items)
- PunchListItem.assignedToUserId (assigned items)
- Vendor.status (find active vendors)
- TurnActivityLog(turnId, createdAt) (recent activity)
- TurnActivityLog.userId (user activity history)

**Implementation:**
- [ ] Create Prisma migration adding all indexes
- [ ] Run migration in dev environment
- [ ] Benchmark query performance before/after
- [ ] Deploy to production

**Files to Update:**
- prisma/schema.prisma

---

### Task 2.3: Standardize Enum Usage
**Status:** ⬜ Not Started  
**Effort:** 3-4 hours  
**Breaking Changes:** No (backward compatible)

**Current Issues:**
- TurnTask.assigneeType is String, should be enum
- Vendor.specialties is String[], should be enum array
- Some fields use string where enum would be safer

**Implementation:**
- [ ] Create AssigneeType enum (IN_HOUSE, VENDOR)
- [ ] Create VendorSpecialty enum (PAINTING, PLUMBING, etc.)
- [ ] Update TurnTask.assigneeType to use enum
- [ ] Update Vendor.specialties type (if Prisma supports enum arrays)
- [ ] Create migration
- [ ] Update route handlers to validate against enums
- [ ] Update tests

**Files to Update:**
- prisma/schema.prisma
- Property Flow Backend/src/routes/turns.ts
- Property Flow Backend/src/routes/admin/* (vendor routes)

---

### Task 2.4: Add Data Integrity Constraints
**Status:** ⬜ Not Started  
**Effort:** 2-3 hours  
**Breaking Changes:** No (validation layer)

**Constraints to Add:**
- If TurnTask.assigneeType = "VENDOR", then vendorId must be set
- Cost fields should be non-negative
- End dates should be >= start dates
- Required date fields for different turn statuses

**Implementation:**
- [ ] Create validation utilities in [src/utils/validators.ts](Property%20Flow%20Backend/src/utils/validators.ts)
- [ ] Add checks in all CRUD routes
- [ ] Add TypeScript types to enforce constraints
- [ ] Add tests for constraint violations

**Files to Update:**
- Property Flow Backend/src/utils/validators.ts
- Property Flow Backend/src/routes/turns.ts
- Property Flow Backend/src/routes/admin/*

---

### Task 2.5: Clarify WorkOrder vs TurnTask
**Status:** ⬜ Not Started  
**Effort:** 2-3 hours  
**Breaking Changes:** None (documentation/clarification)

**Current Confusion:**
- Both WorkOrder and TurnTask exist in schema
- Unclear when to use each
- Potential for duplicate work entries

**Implementation:**
- [ ] Document clear boundaries (add to [STRUCTURE.md](Property%20Flow%20Backend/STRUCTURE.md))
- [ ] WorkOrder = maintenance system, can exist independently
- [ ] TurnTask = specific work within a make-ready turn
- [ ] Consider renaming TurnTask → TurnWorkItem for clarity
- [ ] Add JSDoc comments to both models
- [ ] Review existing routes to ensure correct usage

**Files to Update:**
- Property Flow Backend/STRUCTURE.md
- prisma/schema.prisma (comments)
- Property Flow Backend/src/routes/turns.ts

---

## 🟢 LOW PRIORITY - Phase 3

### Task 3.1: Cost Breakdown Integrity
**Status:** ⬜ Not Started  
**Effort:** 2-3 hours  
**Breaking Changes:** No

**Current Issue:**
- TurnCostBreakdown.totalCost might not stay in sync with component costs

**Implementation:**
- [ ] Decide: computed field vs maintained field
- [ ] Add recalculation logic in service
- [ ] Add tests to verify totalCost = labor + materials + vendor

---

### Task 3.2: FloorPlan Type Extraction (Optional)
**Status:** ⬜ Not Started  
**Effort:** 3-4 hours  
**Breaking Changes:** No

**Consideration:**
- FloorPlan.type (Aspen, Hickory) might benefit from separate FloorPlanType model
- Would prevent type misspellings
- Only if type names are used for policies/rules

---

## Tracking

### Progress
- Total Tasks: 11
- Completed: 0
- In Progress: 0
- Planned: 11

### Current Phase
**Phase:** Planning  
**Estimated Timeline:** 3-4 weeks for all phases  
**Team Capacity:** [Add team members]

### Blocked By
- [ ] Initial code review & team approval of evaluation

### Dependencies
- Task 1.1 (notes consolidation) → should complete before 1.2
- Task 1.3 (denormalization) → should complete before deploying major features
- Phase 1 → should complete before Phase 2

---

## Testing Checklist

Before deploying any changes:

- [ ] All TypeScript compiles without errors
- [ ] All existing API endpoints work with new schema
- [ ] Make-ready board queries return correct data
- [ ] Turn creation workflow completes successfully
- [ ] Punch list items display correctly
- [ ] Cost calculations accurate
- [ ] Permission checks work correctly
- [ ] Activity logs created properly
- [ ] Data migration successful for existing records
- [ ] No data loss in migration
- [ ] Query performance improved or unchanged
- [ ] Frontend types match backend schema

---

## Notes

- Each task can be completed independently (except where noted)
- Use Prisma migrations for all schema changes
- Ensure backwards compatibility where possible
- Update type definitions in both backend and frontend
- Add integration tests as you go
- Update documentation after each phase

---

**Last Updated:** December 22, 2025  
**Next Review:** Before starting Phase 1 implementation
