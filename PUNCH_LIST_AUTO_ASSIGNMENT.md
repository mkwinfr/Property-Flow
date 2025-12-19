# Automatic Punch List Template Assignment

## Overview

When a turn is created for an apartment, the system automatically generates and applies the appropriate punch list based on the apartment's bedroom and bathroom configuration (e.g., 3 Bed / 2 Bath).

## How It Works

### Backend Flow

1. **Turn Creation** (`POST /api/turns/open` or `POST /api/make-ready-turns`)
   - Apartment is fetched with `beds` and `baths` fields
   - `getPunchListItems(beds, baths)` is called to get appropriate items
   - Punch list items are created as part of turn creation transaction

2. **Template Selection**
   - Templates exist for common configurations: 1-1, 2-2, 3-2, and more
   - Each template has pre-configured items organized by:
     - **Area** (Master Bedroom, Kitchen, Living Room, etc.)
     - **Category** (Electrical, Plumbing, Paint/Finishes, etc.)
   - Fallback to 2-2 template if configuration not found

3. **Item Creation**
   - All items created with `status: 'OPEN'`
   - Each item includes `label`, `area`, and `category`
   - Stored in database as `PunchListItem` records linked to `Turn`

### Example Templates

**1 Bed / 1 Bath**
- Master Bedroom (11 items)
- Master Bathroom (21 items)
- Kitchen (12 items)
- Living/Dining Room (9 items)
- Entry/Hallway (6 items)
- Plus: Laundry, A/C Closet, Patio
- **Total: ~70 items**

**2 Bed / 2 Bath**
- Master Bedroom (11 items)
- Master Bathroom (21 items)
- Spare Bedroom (10 items)
- Guest Bathroom (21 items)
- Kitchen (12 items)
- Living/Dining Room (9 items)
- Plus: Entry/Hallway, Laundry, A/C Closet, Patio
- **Total: ~110 items**

**3 Bed / 2 Bath**
- Master Bedroom (11 items)
- Master Bathroom (21 items)
- Spare Bedroom (10 items)
- Guest Bedroom (10 items)
- Guest Bathroom (21 items)
- Kitchen (12 items)
- Living/Dining Room (9 items)
- Plus: Entry/Hallway, Laundry, A/C Closet, Patio
- **Total: ~140 items**

## Frontend Display

The punch list automatically appears in the **Punch List Tab** of the Turn Modal:

1. Turn Modal opens
2. `TurnModal.tsx` fetches full turn data via `GET /api/turns/:id`
3. `turn.punchListItems` is populated from API response
4. `PunchListTab.tsx` renders all items in organized sections
5. Technicians can mark items complete as they work

## Database Changes

**PunchListItem Model**
- Created automatically when turn is created
- Status: `OPEN` by default
- Links: `turnId`, `area`, `category`, `label`

**Turn Model**
- Now includes `punchListItems: PunchListItem[]` relation
- Relation already exists in schema

## API Changes

### GET /api/turns/:id
Now includes punch list items in response:
```json
{
  "id": 123,
  "status": "IN_PROGRESS",
  "apartment": { "beds": 3, "baths": 2 },
  "punchListItems": [
    {
      "id": 1,
      "label": "Ceiling fan",
      "area": "Master Bedroom",
      "category": "Electrical",
      "status": "OPEN"
    },
    ...
  ]
}
```

### POST /api/turns/open
Now creates punch list items automatically based on apartment config.

## Testing

**Manual Test Flow:**

1. Navigate to Make Ready Board
2. Create a new turn with a unit (e.g., 3 Bed 2 Bath)
3. Click "Open" button on turn card
4. Go to **Punch List** tab
5. Verify appropriate items appear for 3 Bed 2 Bath configuration
6. Items should be organized by area and category
7. Ability to mark items complete should work

**Expected Result:**
- ✅ Punch list items auto-populate on turn creation
- ✅ Correct number of items for unit configuration
- ✅ Items organized by area and category
- ✅ All items start with "OPEN" status

## Files Modified

**Backend:**
- `src/routes/turns.ts` - Turn creation endpoints
- `src/utils/punchListTemplate.ts` - New template configuration

**Frontend (No Changes Needed):**
- Already displays punch list from API response
- `components/TurnModal/tabs/PunchListTab.tsx` handles rendering

## Future Enhancements

1. **Admin Panel** - Allow customization of templates per property
2. **Template Versioning** - Track template changes over time
3. **Unit Type Mapping** - Map floor plans to bed/bath automatically
4. **Custom Items** - Allow adding additional punch items at turn creation

---

**Implemented:** December 18, 2025  
**Status:** Production Ready
