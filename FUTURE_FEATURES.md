# Property Suite Future Features

## Inspection development mode

- Keep bulk inspection helpers such as **Mark remaining items good** out of production workflows.
- A future explicit `DevMode` may expose these controls for seeded-data creation, demonstrations, and automated testing.
- Development-only bulk actions must be visually identified, disabled by default, and must never be available to normal property users.
- Production inspections should require an explicit condition assessment for every required scope item so the interface encourages a thorough room-by-room inspection.

## Manager-only financial and purchasing visibility

- Core Make Ready financial redaction, vendor-billing restrictions, financial-document restrictions, and reorder authorization are now enforced for technicians. The remaining work below covers granular permission administration and auditing every secondary surface.
- Restrict Make Ready cost summaries, material costs, vendor quotes, approved amounts, invoices, payment status, resident-charge estimates, and purchasing/reorder controls to authorized managers and administrators.
- Punch technicians should see only the operational information needed to complete assigned work, including scope, notes, materials to use, attachments, deadlines, and work status.
- Hiding controls in the interface is not sufficient. The API must enforce separate permissions so restricted financial data is not returned to unauthorized roles.
- Introduce granular permissions for financial visibility, vendor billing, resident charges, and inventory purchasing rather than relying only on broad Make Ready or inventory access.
- Review notifications, exports, activity history, and attachment access so restricted amounts or invoice documents cannot leak through secondary views.
- Add automated role-based tests confirming that managers can access these records while technicians cannot view or modify them.

## Resident records and resident portal

- Replace temporary work-order contact cards with linked resident and household records. Resident profiles should become the authoritative source for names, phone numbers, email addresses, preferred contact methods, leaseholder status, accessibility needs, pets, communication history, and unit occupancy history.
- Do not duplicate mutable resident contact data across work orders. Preserve only the minimum historical snapshots needed to show who reported and authorized a specific request at that time.
- Create a separate resident-facing portal/application with secure access to account information, balances and rent, resident charges, lease documents and key dates, property announcements, and critical property information.
- Add resident work-order submission to that portal, including category, affected areas, detailed descriptions, photos, permission to enter, appointment preferences, pets/access warnings, and status updates.
- Route resident submissions into the same staff work-order workflow without bypassing property scope, prioritization, access validation, notifications, audit history, or manager-only financial controls.
- Add resident messaging and notification preferences for appointment confirmations, technician arrival windows, work-order updates, completion notices, and follow-up requests.
