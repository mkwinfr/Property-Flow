// src/data/moveoutInspectionTemplate.ts
// Converts punch template to moveout inspection template structure

import { punchTemplate } from './punchTemplates';
import type { MoveoutInspectionTemplate } from '@/types/moveoutInspection';

/**
 * Convert punch template to moveout inspection template
 * Rooms are mapped directly, categories/items use same structure
 */
export function getPunchTemplateAsMoveoutInspection(): MoveoutInspectionTemplate[] {
  return punchTemplate.map((area) => ({
    roomKey: area.area
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, ''),
    roomLabel: area.area,
    categories: area.categories.map((cat) => ({
      categoryKey: cat.category
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, ''),
      categoryLabel: cat.category,
      items: cat.items.map((item) => ({
        itemKey: item.templateKey
          .replace('item-', '')
          .split('-')
          .pop() || item.templateKey,
        itemLabel: item.title,
      })),
    })),
  }));
}

/**
 * Get all items from template in flat list
 */
export function getAllTemplateItems() {
  const template = getPunchTemplateAsMoveoutInspection();
  const items = [];

  for (const room of template) {
    for (const category of room.categories) {
      for (const item of category.items) {
        items.push({
          roomKey: room.roomKey,
          roomLabel: room.roomLabel,
          categoryKey: category.categoryKey,
          categoryLabel: category.categoryLabel,
          itemKey: item.itemKey,
          itemLabel: item.itemLabel,
          templateKey: `${room.roomKey}-${category.categoryKey}-${item.itemKey}`,
        });
      }
    }
  }

  return items;
}

/**
 * Get items grouped by room for inspection UI
 */
export function getTemplateItemsByRoom() {
  const template = getPunchTemplateAsMoveoutInspection();
  const byRoom = new Map();

  for (const room of template) {
    const items = [];
    for (const category of room.categories) {
      for (const item of category.items) {
        items.push({
          roomKey: room.roomKey,
          categoryKey: category.categoryKey,
          itemKey: item.itemKey,
          itemLabel: item.itemLabel,
          categoryLabel: category.categoryLabel,
          templateKey: `${room.roomKey}-${category.categoryKey}-${item.itemKey}`,
        });
      }
    }
    byRoom.set(room.roomKey, {
      roomLabel: room.roomLabel,
      items,
    });
  }

  return byRoom;
}
