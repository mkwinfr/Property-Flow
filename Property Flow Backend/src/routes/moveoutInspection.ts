import { Router } from 'express';
import { prisma } from '../db/prisma';
import {
  MoveoutInspectionStatus,
  MoveoutConditionStatus,
  MoveoutResponsibility,
  MoveoutChargeStatus,
} from '@prisma/client';

const router = Router();

/**
 * POST /api/moveout-inspections
 * Create a new moveout inspection (draft)
 */
router.post('/', async (req, res) => {
  const {
    propertyId,
    unitId,
    apartmentId,
    inspectionType = 'FINAL',
    inspectionDate,
    inspectorUserId,
    notes,
  } = req.body;

  if (!propertyId && !apartmentId) {
    return res.status(400).json({ error: 'propertyId or apartmentId required' });
  }

  try {
    const inspection = await prisma.moveoutInspection.create({
      data: {
        propertyId,
        unitId,
        apartmentId,
        inspectionType: inspectionType as any,
        status: 'DRAFT' as any,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
        inspectorUserId,
        notes,
      },
      include: {
        items: {
          orderBy: [{ roomKey: 'asc' }, { categoryKey: 'asc' }, { itemKey: 'asc' }],
        },
        charges: true,
        media: true,
      },
    });

    res.status(201).json(inspection);
  } catch (err) {
    console.error('Error creating inspection', err);
    res.status(500).json({ error: 'Failed to create inspection' });
  }
});

/**
 * GET /api/moveout-inspections/:id
 * Get inspection by ID with all items, media, and charges
 */
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid inspection id' });
  }

  try {
    const inspection = await prisma.moveoutInspection.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            media: true,
            charges: true,
          },
          orderBy: [{ roomKey: 'asc' }, { categoryKey: 'asc' }, { itemKey: 'asc' }],
        },
        charges: true,
        media: true,
      },
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    res.json(inspection);
  } catch (err) {
    console.error('Error fetching inspection', err);
    res.status(500).json({ error: 'Failed to fetch inspection' });
  }
});

/**
 * PATCH /api/moveout-inspections/:id/items
 * Upsert inspection items (bulk update items, auto-seed template if needed)
 */
router.patch('/:id/items', async (req, res) => {
  const id = Number(req.params.id);
  const { items = [] } = req.body;

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid inspection id' });
  }

  try {
    // Fetch inspection first
    const inspection = await prisma.moveoutInspection.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Upsert each item
    const updates = [];
    for (const item of items) {
      const update = await prisma.moveoutInspectionItem.upsert({
        where: {
          inspectionId_templateKey: {
            inspectionId: id,
            templateKey: item.templateKey || `${item.roomKey}-${item.categoryKey}-${item.itemKey}`,
          },
        },
        update: {
          conditionStatus: item.conditionStatus as any,
          responsibility: item.responsibility as any,
          notes: item.notes,
          costEstimate: item.costEstimate,
          severity: item.severity,
        },
        create: {
          inspectionId: id,
          templateKey: item.templateKey || `${item.roomKey}-${item.categoryKey}-${item.itemKey}`,
          roomKey: item.roomKey,
          categoryKey: item.categoryKey,
          itemKey: item.itemKey,
          itemLabel: item.itemLabel,
          conditionStatus: item.conditionStatus as any || 'NOT_INSPECTED',
          responsibility: item.responsibility as any || 'UNSURE',
          notes: item.notes,
          costEstimate: item.costEstimate,
          severity: item.severity,
        },
      });
      updates.push(update);
    }

    res.json({ items: updates, count: updates.length });
  } catch (err) {
    console.error('Error upserting items', err);
    res.status(500).json({ error: 'Failed to update items' });
  }
});

/**
 * PATCH /api/moveout-inspections/:id/items/:itemId
 * Update a single inspection item
 */
router.patch('/:id/items/:itemId', async (req, res) => {
  const inspectionId = Number(req.params.id);
  const itemId = Number(req.params.itemId);

  if (Number.isNaN(inspectionId) || Number.isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid IDs' });
  }

  try {
    const { conditionStatus, responsibility, notes, costEstimate, severity } = req.body;

    const item = await prisma.moveoutInspectionItem.update({
      where: { id: itemId },
      data: {
        conditionStatus: conditionStatus as any,
        responsibility: responsibility as any,
        notes,
        costEstimate,
        severity,
      },
      include: { media: true },
    });

    res.json(item);
  } catch (err) {
    console.error('Error updating item', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

/**
 * POST /api/moveout-inspections/:id/media
 * Add media (photo/video) to an inspection item
 */
router.post('/:id/media', async (req, res) => {
  const inspectionId = Number(req.params.id);
  const { itemId, mediaType = 'PHOTO', uri, caption } = req.body;

  if (Number.isNaN(inspectionId) || !itemId || !uri) {
    return res.status(400).json({ error: 'inspectionId, itemId, uri required' });
  }

  try {
    const media = await prisma.moveoutInspectionMedia.create({
      data: {
        itemId,
        inspectionId,
        mediaType: mediaType as any,
        uri,
        caption,
      },
    });

    res.status(201).json(media);
  } catch (err) {
    console.error('Error adding media', err);
    res.status(500).json({ error: 'Failed to add media' });
  }
});

/**
 * DELETE /api/moveout-inspections/:id/media/:mediaId
 * Remove media attachment
 */
router.delete('/:id/media/:mediaId', async (req, res) => {
  const mediaId = Number(req.params.mediaId);

  if (Number.isNaN(mediaId)) {
    return res.status(400).json({ error: 'Invalid media id' });
  }

  try {
    await prisma.moveoutInspectionMedia.delete({
      where: { id: mediaId },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting media', err);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

/**
 * POST /api/moveout-inspections/:id/charges
 * Generate charge line items from inspection findings
 * Rules: if conditionStatus=DAMAGE or MISSING and responsibility=TENANT, create charge
 */
router.post('/:id/charges', async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid inspection id' });
  }

  try {
    // Fetch inspection with all items
    const inspection = await prisma.moveoutInspection.findUnique({
      where: { id },
      include: { items: true, charges: true },
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Remove existing proposed charges
    await prisma.moveoutChargeLineItem.deleteMany({
      where: {
        inspectionId: id,
        status: 'PROPOSED',
      },
    });

    // Generate charges for DAMAGE/MISSING with TENANT responsibility
    const chargeData = inspection.items
      .filter((item) => {
        const isDamageOrMissing =
          item.conditionStatus === 'DAMAGE' || item.conditionStatus === 'MISSING';
        const isTenant = item.responsibility === 'TENANT';
        return isDamageOrMissing && isTenant;
      })
      .map((item) => ({
        inspectionId: id,
        itemId: item.id,
        description: `${item.roomKey} - ${item.itemLabel}${item.notes ? ': ' + item.notes : ''}`,
        amount: item.costEstimate || 0,
        status: 'PROPOSED' as any,
      }));

    const charges = await prisma.moveoutChargeLineItem.createMany({
      data: chargeData,
      skipDuplicates: false,
    });

    // Fetch created charges
    const createdCharges = await prisma.moveoutChargeLineItem.findMany({
      where: { inspectionId: id, status: 'PROPOSED' },
    });

    res.json({
      message: 'Charges generated',
      charges: createdCharges,
      count: createdCharges.length,
    });
  } catch (err) {
    console.error('Error generating charges', err);
    res.status(500).json({ error: 'Failed to generate charges' });
  }
});

/**
 * PATCH /api/moveout-inspections/:id/charges/:chargeId
 * Update charge line item
 */
router.patch('/:id/charges/:chargeId', async (req, res) => {
  const chargeId = Number(req.params.chargeId);

  if (Number.isNaN(chargeId)) {
    return res.status(400).json({ error: 'Invalid charge id' });
  }

  try {
    const { description, amount, status } = req.body;

    const charge = await prisma.moveoutChargeLineItem.update({
      where: { id: chargeId },
      data: {
        description,
        amount,
        status: status as any,
      },
    });

    res.json(charge);
  } catch (err) {
    console.error('Error updating charge', err);
    res.status(500).json({ error: 'Failed to update charge' });
  }
});

/**
 * POST /api/moveout-inspections/:id/generate-work
 * Generate tasks/work orders from inspection findings
 * Creates TurnTask entries for WEAR/DAMAGE/MISSING items
 */
router.post('/:id/generate-work', async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid inspection id' });
  }

  try {
    // Fetch inspection with items
    const inspection = await prisma.moveoutInspection.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // For now, just return what tasks would be created (integration with turns/tasks TBD)
    // In a full implementation, this would create TurnTask records
    const taskPreview = inspection.items
      .filter((item) => item.conditionStatus !== 'OK' && item.conditionStatus !== 'NOT_INSPECTED')
      .map((item) => ({
        roomKey: item.roomKey,
        itemLabel: item.itemLabel,
        category: item.categoryKey,
        condition: item.conditionStatus,
        notes: item.notes,
        estimated: item.costEstimate,
      }));

    res.json({
      message: 'Work preview generated',
      tasksToCreate: taskPreview,
      count: taskPreview.length,
    });
  } catch (err) {
    console.error('Error generating work preview', err);
    res.status(500).json({ error: 'Failed to generate work' });
  }
});

/**
 * PATCH /api/moveout-inspections/:id/complete
 * Mark inspection as COMPLETED (all items inspected)
 */
router.patch('/:id/complete', async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid inspection id' });
  }

  try {
    const inspection = await prisma.moveoutInspection.update({
      where: { id },
      data: { status: 'COMPLETED' as any },
      include: {
        items: true,
        charges: true,
      },
    });

    res.json(inspection);
  } catch (err) {
    console.error('Error completing inspection', err);
    res.status(500).json({ error: 'Failed to complete inspection' });
  }
});

/**
 * PATCH /api/moveout-inspections/:id/lock
 * Lock inspection (read-only unless admin unlock)
 */
router.patch('/:id/lock', async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid inspection id' });
  }

  try {
    const inspection = await prisma.moveoutInspection.update({
      where: { id },
      data: { status: 'LOCKED' as any },
      include: {
        items: true,
        charges: true,
      },
    });

    res.json(inspection);
  } catch (err) {
    console.error('Error locking inspection', err);
    res.status(500).json({ error: 'Failed to lock inspection' });
  }
});

export default router;
