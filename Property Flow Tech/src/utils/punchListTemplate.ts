import { punchTemplate, flattenPunchTemplate } from '@/data/punchTemplates';
import type { PunchTemplateItem } from '@/types/punch-list';

/**
 * Get the appropriate punch list template based on apartment bed/bath configuration
 * @param beds Number of bedrooms
 * @param baths Number of bathrooms
 * @returns Flattened array of punch list items for the unit configuration
 */
export function getPunchListForUnit(beds?: number, baths?: number): PunchTemplateItem[] {
  // If no bed/bath info, return full template
  if (!beds || !baths) {
    return flattenPunchTemplate(punchTemplate);
  }

  // Get the full template
  const fullTemplate = flattenPunchTemplate(punchTemplate);
  
  // Filter based on unit configuration
  // This is a smart filter that includes certain areas based on bed/bath count
  const filteredItems = fullTemplate.filter((item) => {
    const area = item.area?.toLowerCase() || '';
    
    // Always include these areas
    const alwaysInclude = ['kitchen', 'living room', 'dining room', 'entry', 'hallway', 'laundry', 'utility', 'patio', 'trash', 'a/c closet'];
    if (alwaysInclude.some(a => area.includes(a))) {
      return true;
    }

    // Master bedroom & bathroom - always include
    if (area.includes('master')) {
      return true;
    }

    // Spare bedroom - include if 2+ beds
    if (area.includes('spare bedroom') || area.includes('secondary bedroom')) {
      return beds >= 2;
    }

    // Guest bedroom - include if 3+ beds
    if (area.includes('guest bedroom')) {
      return beds >= 3;
    }

    // Additional bathroom - include if 2+ baths
    if ((area.includes('bathroom') || area.includes('bath')) && !area.includes('master')) {
      return baths >= 2;
    }

    // Default: include
    return true;
  });

  return filteredItems;
}

/**
 * Generate punch list item display names with proper formatting
 * @param bedrooms Number of bedrooms
 * @param bathrooms Number of bathrooms
 * @returns Human readable description (e.g., "3 Bed / 2 Bath")
 */
export function formatUnitConfiguration(bedrooms?: number, bathrooms?: number): string {
  if (!bedrooms || !bathrooms) return 'Unknown';
  
  const bed = bedrooms === 1 ? 'Bed' : 'Beds';
  const bath = bathrooms === 1 ? 'Bath' : 'Baths';
  
  return `${bedrooms} ${bed} / ${bathrooms} ${bath}`;
}
