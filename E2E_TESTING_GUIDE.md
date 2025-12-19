# Property Flow - End-to-End Testing Guide

## Pre-Flight Checklist

- ✅ Backend running on http://localhost:4000
- ✅ Frontend running on http://localhost:5173
- ✅ PostgreSQL database configured and accessible
- ✅ All migrations applied: `npm run prisma:migrate deploy`

## Complete Turn Workflow Test Scenarios

### Scenario 1: Basic Turn Inspection & Punch List (Tech User)

**Preconditions:**
- Have at least one turn in the database in VACANT status
- Turn should have some inspection data populated

**Steps:**

1. Navigate to **Make Ready Board** tab
2. Click the "Open" button on any card
3. **Verify TurnModal Opens**
   - Modal displays correct apartment unit number
   - Status badge shows current turn status
   - All four tabs visible: Move Out | Punch List | Vendor | Updates

4. **Move Out Inspection Tab**
   - Verify inspection grid displays condition data (overall, walls, flooring, etc.)
   - Verify appliances list shows at least 4 appliances
   - Change one appliance status to "🔧 Needs Repair"
   - Add a note to that appliance
   - Click "Save Appliance Updates"
   - **Verify notification:** "Success" toast appears
   - Refresh modal data to confirm appliance update persisted

5. **Punch List Tab**
   - Verify punch list items display (if any exist)
   - If items exist:
     - Toggle one item status from OPEN to COMPLETE
     - **Verify:** Item status badge updates color
     - Add inventory to an item:
       - Click inventory picker dropdown
       - Select a category (e.g., "GENERAL_MAINTENANCE")
       - Select an inventory item
       - Adjust quantity
       - **Verify:** Item quantity and cost display updates
       - Remove the inventory item
       - **Verify:** Item cost recalculates

6. **Vendor Services Tab**
   - Verify tab displays (read-only for now)
   - Should show placeholder vendor services

7. **Updates Log Tab**
   - Verify activity timeline displays
   - Verify cost breakdown shows:
     - Labor Cost
     - Materials Cost
     - Vendor Services Cost
     - Total Cost

### Scenario 2: Manager Review & Approval Flow

**Preconditions:**
- Have a turn in PENDING_REVIEW status
- Activity log should show recent tech actions

**Steps:**

1. Open turn modal for the PENDING_REVIEW turn
2. **Verify Manager Controls Visible**
   - System should automatically navigate to "Updates" tab
   - Two buttons should appear:
     - ✓ Approve & Mark Vacant Ready
     - ↻ Request Rework

3. **Test Approve Action**
   - Click "Approve & Mark Vacant Ready"
   - **Verify:** Success notification appears
   - **Verify:** Button shows "Processing..." state
   - **Verify:** After completion, turn status changes to VACANT_READY
   - **Verify:** New activity log entry appears with manager action
   - **Verify:** Modal tab automatically switches back to Updates

4. **Test Rework Request Action** (requires separate turn in PENDING_REVIEW)
   - Click "Request Rework"
   - **Verify:** Warning notification appears
   - **Verify:** Button shows "Processing..." state
   - **Verify:** After completion, turn status changes back to IN_PROGRESS
   - **Verify:** New activity log entry appears with rework request
   - **Verify:** Tech can now edit punch list again

### Scenario 3: Notifications System Test

**Steps:**

1. Perform any manager action (approve/rework)
2. **Verify Notification Toast**
   - Appears in top-right corner
   - Displays correct type (success/error/warning)
   - Shows appropriate title and message
   - Has visible close button
   - Auto-dismisses after ~4 seconds

3. **Verify Multiple Notifications**
   - Trigger multiple actions quickly
   - **Verify:** Multiple notifications stack vertically
   - **Verify:** Each notification independently dismissible
   - **Verify:** Oldest notification appears at bottom

### Scenario 4: Error Handling & Edge Cases

**Steps:**

1. **Network Error Test**
   - Disconnect network (or simulate in DevTools)
   - Try to approve a turn
   - **Verify:** Error notification appears
   - **Verify:** Error message is descriptive
   - **Verify:** Buttons remain clickable for retry

2. **Loading State Test**
   - Open a turn modal
   - **Verify:** "Loading turn data..." message appears briefly
   - **Verify:** Content appears after data loads

3. **Empty Data Test**
   - Open a turn with no punch list items
   - **Verify:** Empty state message displays
   - Open a turn with no activity log
   - **Verify:** "No activity yet" message displays

### Scenario 5: Data Persistence Test

**Steps:**

1. Open a turn modal
2. Make an appliance update and save
3. Close the modal
4. Reopen the same turn
5. **Verify:** Appliance update persisted
6. Check activity log for the action
7. **Verify:** New log entry exists

## API Endpoints Being Tested

| Method | Endpoint | Expected Response | Test Result |
|--------|----------|-------------------|------------|
| GET | `/api/turns/:turnId` | Complete turn data with relations | ⬜ |
| PATCH | `/api/turns/:turnId` | Updated turn (appliances) | ⬜ |
| POST | `/api/turns/:turnId/manager-approve` | Turn with VACANT_READY status | ⬜ |
| POST | `/api/turns/:turnId/manager-request-rework` | Turn with IN_PROGRESS status | ⬜ |
| GET | `/api/turns/:turnId/punch-items` | Array of punch list items | ⬜ |
| GET | `/api/turns/:turnId/cost-breakdown` | Cost breakdown data | ⬜ |
| GET | `/api/turns/:turnId/activity-log` | Array of activity log entries | ⬜ |

## Debugging Tips

**Frontend Issues:**
```bash
# Check browser console (F12) for errors
# Check Network tab for API calls
# Check React DevTools for component state
```

**Backend Issues:**
```bash
# Check server terminal for error logs
# Verify database connection: npm run prisma:studio
# Check request body with console.log in route handlers
```

**Database Issues:**
```bash
# View current data
npm run prisma:studio

# Check migrations
npm run prisma:migrate status

# Reset database (development only)
npm run prisma:migrate reset
```

## Success Criteria

✅ All notifications display correctly  
✅ Manager approval changes turn status to VACANT_READY  
✅ Manager rework request changes turn status to IN_PROGRESS  
✅ Appliance updates persist across modal close/reopen  
✅ Activity log updates after each action  
✅ Cost breakdown accurately reflects items and materials  
✅ No console errors during workflow  
✅ All API calls return 200/201 status codes  
✅ Button loading states show during API calls  
✅ Error messages display when API fails  

## Known Limitations (v1.0)

- ❌ Desktop app integration (coming next)
- ❌ Vendor service booking (placeholder only)
- ❌ Real inventory sync with backend (mock data used)
- ❌ User auth (hardcoded user ID)
- ❌ Email notifications (in-app only)
- ❌ Role-based UI (manager always sees approve buttons)
