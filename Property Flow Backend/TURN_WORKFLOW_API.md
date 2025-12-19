# Turn Workflow API Documentation

## Base URL
```
http://localhost:4000/api
```

## Punch List Items

### GET `/turns/:turnId/punch-items`
Fetch all punch list items for a turn.

**Response:**
```json
[
  {
    "id": 1,
    "turnId": 1,
    "label": "Replace Faucet",
    "area": "Kitchen",
    "category": "Plumbing",
    "status": "OPEN",
    "notes": "Kitchen sink faucet leaking",
    "assignedToUserId": 5,
    "createdAt": "2025-12-19T08:30:00Z",
    "updatedAt": "2025-12-19T08:30:00Z",
    "completedAt": null,
    "completedByUserId": null,
    "assignedTo": {
      "id": 5,
      "name": "John Tech",
      "email": "john@company.com"
    },
    "inventoryUsages": [
      {
        "id": 1,
        "punchListItemId": 1,
        "inventoryItemId": 10,
        "quantityUsed": 1,
        "unitCost": 45.00,
        "costOverride": null,
        "createdAt": "2025-12-19T08:45:00Z",
        "updatedAt": "2025-12-19T08:45:00Z",
        "inventoryItem": {
          "id": 10,
          "name": "Faucet - Chrome Single Handle",
          "sku": "FAU-001",
          "unitCost": 45.00
        }
      }
    ]
  }
]
```

### POST `/turns/:turnId/punch-items`
Create a new punch list item.

**Request Body:**
```json
{
  "label": "Replace Toilet",
  "area": "Bathroom",
  "category": "Plumbing",
  "notes": "Fill valve broken",
  "assignedToUserId": 5,
  "userId": 3
}
```

**Response:** Same as single item above (201 Created)

### PATCH `/turns/:turnId/punch-items/:itemId`
Update punch list item (mark complete, add materials, etc).

**Request Body:**
```json
{
  "status": "COMPLETE",
  "notes": "Fixed and tested",
  "inventoryUsages": [
    {
      "inventoryItemId": 15,
      "quantityUsed": 1
    },
    {
      "inventoryItemId": 16,
      "quantityUsed": 2
    }
  ],
  "userId": 5
}
```

**Logic:**
- If `status` is `COMPLETE`, inventory items are decremented
- Each inventory usage is logged to activity log
- Original unit costs are captured at time of usage

**Response:** Updated punch item with all relations

### DELETE `/turns/:turnId/punch-items/:itemId`
Delete a punch list item.

**Response:**
```json
{
  "success": true
}
```

---

## Inventory Management

### GET `/inventory`
Get all inventory items with optional filtering.

**Query Parameters:**
- `category` - Filter by WorkCategory (e.g., `PLUMBING`, `FLOORING`, `ALL`)
- `search` - Search by name, SKU, or tags

**Example:**
```
GET /inventory?category=PLUMBING&search=faucet
```

**Response:**
```json
[
  {
    "id": 10,
    "name": "Faucet - Chrome Single Handle",
    "sku": "FAU-001",
    "tags": ["Plumbing", "Kitchen", "Faucets"],
    "category": "PLUMBING",
    "quantity": 5,
    "unitCost": 45.00,
    "supplier": "Home Depot",
    "lastRestocked": "2025-12-15T10:00:00Z",
    "createdAt": "2025-12-01T00:00:00Z",
    "updatedAt": "2025-12-15T10:00:00Z"
  }
]
```

### POST `/inventory`
Create a new inventory item.

**Request Body:**
```json
{
  "name": "Faucet - Chrome Single Handle",
  "sku": "FAU-001",
  "tags": ["Plumbing", "Kitchen", "Faucets"],
  "category": "PLUMBING",
  "quantity": 5,
  "unitCost": 45.00,
  "supplier": "Home Depot"
}
```

**Response:** Newly created inventory item (201 Created)

### PATCH `/inventory/:itemId`
Update inventory item details.

**Request Body:**
```json
{
  "quantity": 3,
  "unitCost": 42.50,
  "supplier": "Lowe's"
}
```

**Response:** Updated inventory item

---

## Inventory Usage (Materials on Punch Items)

### PATCH `/punch-items-usage/:usageId`
Override cost for a specific material usage (manager-only typically).

**Request Body:**
```json
{
  "costOverride": 40.00,
  "userId": 2
}
```

**Response:**
```json
{
  "id": 1,
  "punchListItemId": 1,
  "inventoryItemId": 10,
  "quantityUsed": 1,
  "unitCost": 45.00,
  "costOverride": 40.00,
  "createdAt": "2025-12-19T08:45:00Z",
  "updatedAt": "2025-12-19T09:00:00Z",
  "punchListItem": { ... },
  "inventoryItem": { ... }
}
```

**Activity Log Created:** `COST_OVERRIDDEN` action logged

### DELETE `/punch-items-usage/:usageId`
Remove an inventory usage from a punch item and restore inventory quantity.

**Response:**
```json
{
  "success": true
}
```

---

## Turn Workflow Management

### PATCH `/turns/:turnId`
Update turn status, manager notes, or recalculate costs.

**Request Body:**
```json
{
  "status": "PENDING_REVIEW",
  "managerReviewNotes": "Reviewed and approved",
  "reviewedByUserId": 2,
  "userId": 2
}
```

**Response:**
```json
{
  "id": 1,
  "apartmentId": 42,
  "status": "PENDING_REVIEW",
  "managerReviewNotes": "Reviewed and approved",
  "reviewedByUserId": 2,
  "reviewedAt": "2025-12-19T10:00:00Z",
  "costBreakdown": {
    "id": 1,
    "turnId": 1,
    "laborCost": 150.00,
    "materialsCost": 123.50,
    "vendorServicesCost": 0,
    "totalCost": 273.50
  },
  "punchListItems": [ ... ],
  "activityLogs": [ ... ]
}
```

**Auto-calculates cost breakdown** based on materials used + cost overrides

### GET `/turns/:turnId/cost-breakdown`
Get cost breakdown for a turn.

**Response:**
```json
{
  "id": 1,
  "turnId": 1,
  "laborCost": 150.00,
  "materialsCost": 123.50,
  "vendorServicesCost": 0.00,
  "totalCost": 273.50,
  "createdAt": "2025-12-19T08:00:00Z",
  "updatedAt": "2025-12-19T10:00:00Z"
}
```

### GET `/turns/:turnId/activity-log`
Get complete activity log for a turn (sorted newest first).

**Response:**
```json
[
  {
    "id": 15,
    "turnId": 1,
    "userId": 2,
    "activityType": "MANAGER_APPROVED",
    "punchListItemId": null,
    "inventoryItemId": null,
    "details": {
      "notes": "Unit ready for occupancy"
    },
    "createdAt": "2025-12-19T14:00:00Z",
    "user": {
      "id": 2,
      "name": "Jane Manager",
      "email": "jane@company.com"
    }
  },
  {
    "id": 14,
    "turnId": 1,
    "userId": 5,
    "activityType": "INVENTORY_USED",
    "punchListItemId": 1,
    "inventoryItemId": 10,
    "details": {
      "itemName": "Faucet - Chrome Single Handle",
      "quantityUsed": 1,
      "unitCost": 45.00
    },
    "createdAt": "2025-12-19T09:30:00Z",
    "user": {
      "id": 5,
      "name": "John Tech",
      "email": "john@company.com"
    }
  }
]
```

---

## Workflow State Transitions

### POST `/turns/:turnId/mark-punch-list-complete`
Tech marks all punch list items as complete, triggering manager review.

**Request Body:**
```json
{
  "userId": 5
}
```

**Effects:**
- Turn status → `PENDING_REVIEW`
- Logs: `PUNCH_LIST_COMPLETED` activity
- Manager is notified (integration point)

**Response:**
```json
{
  "id": 1,
  "status": "PENDING_REVIEW",
  ...
}
```

### POST `/turns/:turnId/manager-approve`
Manager approves turn and marks unit ready (VACANT_READY).

**Request Body:**
```json
{
  "userId": 2,
  "notes": "Unit ready for occupancy - all items verified"
}
```

**Effects:**
- Turn status → `VACANT_READY`
- Logs: `MANAGER_APPROVED` activity
- Unit exits Make Ready Board
- Unit can now be added to Available Units

**Response:**
```json
{
  "id": 1,
  "status": "VACANT_READY",
  "managerReviewNotes": "Unit ready for occupancy - all items verified",
  "reviewedByUserId": 2,
  "reviewedAt": "2025-12-19T14:00:00Z",
  ...
}
```

### POST `/turns/:turnId/manager-request-rework`
Manager requests additional work, sending turn back to tech.

**Request Body:**
```json
{
  "userId": 2,
  "notes": "Paint touch-ups needed in living room",
  "itemsToRework": [3, 5]
}
```

**Effects:**
- Turn status → `IN_PROGRESS`
- Specified punch items reopened (status → `OPEN`)
- `completedAt` and `completedByUserId` cleared
- Logs: `MANAGER_REQUESTED_REWORK` activity
- Tech is notified to revisit specific items

**Response:**
```json
{
  "id": 1,
  "status": "IN_PROGRESS",
  "managerReviewNotes": "Paint touch-ups needed in living room",
  "punchListItems": [
    {
      "id": 3,
      "status": "OPEN",
      "completedAt": null,
      "completedByUserId": null
    }
  ],
  ...
}
```

---

## Activity Log Types

All activities create `TurnActivityLog` entries:

| Type | Triggered By | Details |
|------|--------------|---------|
| `ITEM_OPENED` | Item creation | Initial item data |
| `ITEM_COMPLETED` | Tech marks complete | Item label |
| `ITEM_ADDED` | Manager adds item | Item label, area |
| `PUNCH_LIST_COMPLETED` | Tech clicks "Complete Punch List" | - |
| `MANAGER_REVIEW_STARTED` | Manager opens turn | - |
| `MANAGER_APPROVED` | Manager approves | Manager notes |
| `MANAGER_REQUESTED_REWORK` | Manager sends back | Rework notes, item IDs |
| `INVENTORY_USED` | Item marked complete with parts | Part name, quantity, cost |
| `COST_OVERRIDDEN` | Manager overrides cost | Original cost, new cost |
| `APPLIANCE_UPDATED` | Appliance replaced | Old/new appliance info |
| `VENDOR_SERVICE_ADDED` | Vendor service created | Service type, cost |
| `TURN_STATUS_CHANGED` | Any status transition | New status |

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Description of what went wrong"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (missing required fields)
- `404` - Not Found (turn, item, inventory not found)
- `500` - Server Error

---

## Integration Checklist

- [ ] Inventory items seeded with initial data
- [ ] Cost calculation tested with multiple parts per item
- [ ] Manager cost overrides logged correctly
- [ ] Inventory decrements only on item completion
- [ ] Status transitions work correctly
- [ ] Activity log captures all events
- [ ] Notifications sent on PENDING_REVIEW and rework request
- [ ] Appliance update flow implemented
- [ ] Frontend properly calls endpoints
- [ ] Error handling tested
