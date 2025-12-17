import { PunchItemCategory, PunchTemplateArea } from '../types';

export const punchTemplate: PunchTemplateArea[] = [
  {
    area: 'Master Bedroom',
    categories: [
      {
        category: 'Electrical' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bed-ceiling-fan', title: 'Ceiling fan - replace bulb' },
          { templateKey: 'item-master-bed-outlets', title: 'Outlets' },
          { templateKey: 'item-master-bed-switch-plate', title: 'Wall switch plate' },
        ],
      },
      {
        category: 'HVAC/Ventilation' as PunchItemCategory,
        items: [{ templateKey: 'item-master-bed-register', title: 'Register - paint/replace (12x6)' }],
      },
      {
        category: 'Doors & Windows' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bed-blinds', title: 'Blinds' },
          { templateKey: 'item-master-bed-window-screen', title: 'Window screen' },
          { templateKey: 'item-master-bed-entry-door', title: 'Entry door' },
          { templateKey: 'item-master-bed-door-stop', title: 'Door stop' },
        ],
      },
      {
        category: 'Paint/Finishes' as PunchItemCategory,
        items: [{ templateKey: 'item-master-bed-paint', title: 'Paint' }],
      },
      {
        category: 'Flooring' as PunchItemCategory,
        items: [{ templateKey: 'item-master-bed-carpet', title: 'Carpet' }],
      },
    ],
  },
  {
    area: 'Master Bathroom',
    categories: [
      {
        category: 'Electrical' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bath-light-bulbs', title: 'Light bulbs' },
          { templateKey: 'item-master-bath-switch-cover', title: 'Switch cover' },
          { templateKey: 'item-master-bath-exhaust-fan', title: 'Exhaust fan' },
          { templateKey: 'item-master-bath-closet-globe', title: 'Closet globe' },
        ],
      },
      {
        category: 'Plumbing' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bath-toilet-caulk', title: 'Toilet - caulk' },
          { templateKey: 'item-master-bath-toilet-seat', title: 'Toilet seat - replace (round)' },
          { templateKey: 'item-master-bath-sink-touch-up', title: 'Sink - touch up' },
          { templateKey: 'item-master-bath-shower-head', title: 'Shower head' },
          { templateKey: 'item-master-bath-tub-touch-up', title: 'Tub - touch up & drain peeking' },
          { templateKey: 'item-master-bath-tub-drain', title: 'Tub drain' },
          { templateKey: 'item-master-bath-diverter', title: 'Diverter' },
          { templateKey: 'item-master-bath-faucet', title: 'Faucet' },
        ],
      },
      {
        category: 'Cabinetry' as PunchItemCategory,
        items: [{ templateKey: 'item-master-bath-cabinets-paint', title: 'Cabinets - paint' }],
      },
      {
        category: 'Fixtures & Hardware' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bath-tp-holder', title: 'TP roll holder' },
          { templateKey: 'item-master-bath-towel-bar', title: 'Towel bar' },
          { templateKey: 'item-master-bath-shower-rod', title: 'Shower rod - replace' },
          { templateKey: 'item-master-bath-door-stop', title: 'Door stop' },
        ],
      },
      {
        category: 'Doors & Windows' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bath-door-replace', title: 'Door - replace' },
          { templateKey: 'item-master-bath-closet-door', title: 'Closet door' },
        ],
      },
      {
        category: 'HVAC/Ventilation' as PunchItemCategory,
        items: [{ templateKey: 'item-master-bath-register', title: 'Register - paint/replace (10x4)' }],
      },
      {
        category: 'Paint/Finishes' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bath-countertops', title: 'Countertops - rough' },
          { templateKey: 'item-master-bath-tub-surround', title: 'Tub surround' },
          { templateKey: 'item-master-bath-closet-shelves', title: 'Closet shelves' },
        ],
      },
    ],
  },
];

export function flattenPunchTemplate(template: PunchTemplateArea[]) {
  return template.flatMap((area) =>
    area.categories.flatMap((category) =>
      category.items.map((item) => ({
        ...item,
        area: area.area,
        category: category.category,
      }))
    )
  );
}
