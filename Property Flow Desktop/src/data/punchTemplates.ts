import type { PunchItemCategory, PunchTemplateArea, PunchTemplateItem } from '@/types/punch-list';

export const punchTemplate: PunchTemplateArea[] = [
  {
    area: 'Master Bedroom',
    categories: [
      {
        category: 'Electrical' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bed-ceiling-fan', title: 'Ceiling fan' },
          { templateKey: 'item-master-bed-outlets', title: 'Outlets' },
          { templateKey: 'item-master-bed-switch-plate', title: 'Wall switch plate' },
          { templateKey: 'item-master-bed-closet-globe', title: 'Closet globe' },
        ],
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
        category: 'HVAC/Ventilation' as PunchItemCategory,
        items: [{ templateKey: 'item-master-bed-register', title: 'Register' }],
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
        ],
      },
      {
        category: 'Plumbing' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bath-toilet', title: 'Toilet' },
          { templateKey: 'item-master-bath-toilet-seat', title: 'Toilet seat' },
          { templateKey: 'item-master-bath-sink', title: 'Sink' },
          { templateKey: 'item-master-bath-shower-head', title: 'Shower head' },
          { templateKey: 'item-master-bath-tub', title: 'Tub' },
          { templateKey: 'item-master-bath-tub-drain', title: 'Tub drain' },
          { templateKey: 'item-master-bath-diverter', title: 'Diverter' },
          { templateKey: 'item-master-bath-faucet', title: 'Faucet' },
        ],
      },
      {
        category: 'Cabinetry' as PunchItemCategory,
        items: [{ templateKey: 'item-master-bath-cabinets', title: 'Cabinets' }],
      },
      {
        category: 'Fixtures & Hardware' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bath-tp-holder', title: 'TP roll holder' },
          { templateKey: 'item-master-bath-towel-bar', title: 'Towel bar' },
          { templateKey: 'item-master-bath-shower-rod', title: 'Shower rod' },
          { templateKey: 'item-master-bath-door-stop', title: 'Door stop' },
        ],
      },
      {
        category: 'Doors & Windows' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bath-door', title: 'Door' },
          { templateKey: 'item-master-bath-closet-door', title: 'Closet door' },
        ],
      },
      {
        category: 'HVAC/Ventilation' as PunchItemCategory,
        items: [{ templateKey: 'item-master-bath-register', title: 'Register' }],
      },
      {
        category: 'Paint/Finishes' as PunchItemCategory,
        items: [
          { templateKey: 'item-master-bath-countertops', title: 'Countertops' },
          { templateKey: 'item-master-bath-tub-surround', title: 'Tub surround' },
          { templateKey: 'item-master-bath-closet-shelves', title: 'Closet shelves' },
        ],
      },
    ],
  },
  {
    area: 'Spare Bedroom',
    categories: [
      {
        category: 'Electrical' as PunchItemCategory,
        items: [
          { templateKey: 'item-spare-bed-light-bulbs', title: 'Light bulbs' },
          { templateKey: 'item-spare-bed-ceiling-fan', title: 'Ceiling fan / light' },
          { templateKey: 'item-spare-bed-outlets', title: 'Outlets' },
          { templateKey: 'item-spare-bed-switch-covers', title: 'Switch covers' },
          { templateKey: 'item-spare-bed-co2-alarm', title: 'CO₂ alarm' },
          { templateKey: 'item-spare-bed-globe', title: 'Globe' },
        ],
      },
      {
        category: 'Doors & Windows' as PunchItemCategory,
        items: [
          { templateKey: 'item-spare-bed-blinds', title: 'Blinds' },
          { templateKey: 'item-spare-bed-window-screen', title: 'Window screen' },
          { templateKey: 'item-spare-bed-entry-door', title: 'Entry door' },
          { templateKey: 'item-spare-bed-door-stop', title: 'Door stop' },
          { templateKey: 'item-spare-bed-closet-door', title: 'Closet door' },
        ],
      },
      {
        category: 'HVAC/Ventilation' as PunchItemCategory,
        items: [{ templateKey: 'item-spare-bed-register', title: 'Register' }],
      },
      {
        category: 'Paint/Finishes' as PunchItemCategory,
        items: [{ templateKey: 'item-spare-bed-paint', title: 'Paint' }],
      },
      {
        category: 'Flooring' as PunchItemCategory,
        items: [
          { templateKey: 'item-spare-bed-carpet', title: 'Carpet' },
          { templateKey: 'item-spare-bed-shelves', title: 'Shelves' },
        ],
      },
    ],
  },
  {
    area: 'Spare Bathroom',
    categories: [
      {
        category: 'Electrical' as PunchItemCategory,
        items: [
          { templateKey: 'item-spare-bath-light-bulbs', title: 'Light bulbs' },
          { templateKey: 'item-spare-bath-switch-cover', title: 'Switch cover' },
          { templateKey: 'item-spare-bath-exhaust-fan', title: 'Exhaust fan' },
          { templateKey: 'item-spare-bath-gfci', title: 'GFCI' },
        ],
      },
      {
        category: 'Plumbing' as PunchItemCategory,
        items: [
          { templateKey: 'item-spare-bath-sink', title: 'Sink' },
          { templateKey: 'item-spare-bath-diverter', title: 'Diverter' },
          { templateKey: 'item-spare-bath-tub-drain', title: 'Tub drain' },
          { templateKey: 'item-spare-bath-shower-head', title: 'Shower head' },
          { templateKey: 'item-spare-bath-tub', title: 'Tub' },
          { templateKey: 'item-spare-bath-faucet', title: 'Faucet' },
        ],
      },
      {
        category: 'Cabinetry' as PunchItemCategory,
        items: [{ templateKey: 'item-spare-bath-cabinets', title: 'Cabinets' }],
      },
      {
        category: 'Fixtures & Hardware' as PunchItemCategory,
        items: [
          { templateKey: 'item-spare-bath-tp-holder', title: 'TP roll holder' },
          { templateKey: 'item-spare-bath-toilet-seat', title: 'Toilet seat' },
          { templateKey: 'item-spare-bath-towel-bar', title: 'Towel bar' },
          { templateKey: 'item-spare-bath-shower-rod', title: 'Shower rod' },
          { templateKey: 'item-spare-bath-toilet', title: 'Toilet' },
        ],
      },
      {
        category: 'Paint/Finishes' as PunchItemCategory,
        items: [
          { templateKey: 'item-spare-bath-countertops', title: 'Countertops' },
          { templateKey: 'item-spare-bath-tub-surround', title: 'Tub / Surround' },
          { templateKey: 'item-spare-bath-tub-surround-alt', title: 'Tub surround' },
        ],
      },
      {
        category: 'Doors & Windows' as PunchItemCategory,
        items: [{ templateKey: 'item-spare-bath-entry-door', title: 'Entry door' }],
      },
      {
        category: 'HVAC/Ventilation' as PunchItemCategory,
        items: [{ templateKey: 'item-spare-bath-register', title: 'Register' }],
      },
    ],
  },
  {
    area: 'Kitchen',
    categories: [
      {
        category: 'Plumbing' as PunchItemCategory,
        items: [
          { templateKey: 'item-kitchen-sprayer', title: 'Sprayer' },
          { templateKey: 'item-kitchen-faucet', title: 'Faucet' },
          { templateKey: 'item-kitchen-sink-basin', title: 'Sink basin' },
          { templateKey: 'item-kitchen-sink-stopper', title: 'Sink stopper' },
          { templateKey: 'item-kitchen-disposal', title: 'Disposal' },
          { templateKey: 'item-kitchen-disposal-stopper', title: 'Disposal stopper' },
        ],
      },
      {
        category: 'Electrical' as PunchItemCategory,
        items: [
          { templateKey: 'item-kitchen-outlets', title: 'Outlets' },
          { templateKey: 'item-kitchen-gfci-outlets', title: 'GFCI outlets' },
          { templateKey: 'item-kitchen-light-switches', title: 'Light switches' },
          { templateKey: 'item-kitchen-overhead-light', title: 'Overhead light' },
        ],
      },
      {
        category: 'Accessories' as PunchItemCategory,
        items: [
          { templateKey: 'item-kitchen-stove', title: 'Stove' },
          { templateKey: 'item-kitchen-range-hood', title: 'Range hood' },
          { templateKey: 'item-kitchen-fridge', title: 'Fridge' },
          { templateKey: 'item-kitchen-dishwasher', title: 'Dishwasher' },
        ],
      },
      {
        category: 'HVAC/Ventilation' as PunchItemCategory,
        items: [{ templateKey: 'item-kitchen-register', title: 'Register' }],
      },
      {
        category: 'Cabinetry' as PunchItemCategory,
        items: [{ templateKey: 'item-kitchen-cabinets', title: 'Cabinets' }],
      },
      {
        category: 'Fire / Life Safety' as PunchItemCategory,
        items: [
          { templateKey: 'item-kitchen-fire-stops', title: 'Fire stops' },
          { templateKey: 'item-kitchen-sprinkler-head', title: 'Sprinkler head' },
        ],
      },
    ],
  },
  {
    area: 'Laundry',
    categories: [
      {
        category: 'Electrical' as PunchItemCategory,
        items: [
          { templateKey: 'item-laundry-globe', title: 'Globe' },
          { templateKey: 'item-laundry-120v-outlets', title: '120V outlets' },
          { templateKey: 'item-laundry-240v-outlet', title: '240V outlet' },
          { templateKey: 'item-laundry-light-switch', title: 'Light switch' },
        ],
      },
      {
        category: 'Plumbing' as PunchItemCategory,
        items: [
          { templateKey: 'item-laundry-hc-hookup', title: 'H/C hookup' },
          { templateKey: 'item-laundry-dryer-connection', title: 'Dryer connection' },
        ],
      },
      {
        category: 'HVAC/Ventilation' as PunchItemCategory,
        items: [{ templateKey: 'item-laundry-register', title: 'Register' }],
      },
      {
        category: 'Flooring' as PunchItemCategory,
        items: [{ templateKey: 'item-laundry-shelves', title: 'Shelves' }],
      },
    ],
  },
  {
    area: 'Living Room / Dining Room',
    categories: [
      {
        category: 'Electrical' as PunchItemCategory,
        items: [
          { templateKey: 'item-living-dining-light', title: 'Dining room light' },
          { templateKey: 'item-living-dining-outlets', title: 'Outlets' },
          { templateKey: 'item-living-dining-ceiling-fan', title: 'Ceiling fan' },
          { templateKey: 'item-living-dining-co2-alarm', title: 'CO₂ alarm' },
        ],
      },
      {
        category: 'HVAC/Ventilation' as PunchItemCategory,
        items: [
          { templateKey: 'item-living-dining-register-dining', title: 'Register (Dining)' },
          { templateKey: 'item-living-dining-register-living', title: 'Register (Living Room)' },
        ],
      },
      {
        category: 'Doors & Windows' as PunchItemCategory,
        items: [
          { templateKey: 'item-living-dining-window-screen', title: 'Window screen' },
          { templateKey: 'item-living-dining-patio-door-blinds', title: 'Patio door blinds' },
          { templateKey: 'item-living-dining-bay-window-blinds', title: 'Bay window blinds' },
        ],
      },
      {
        category: 'Fire / Life Safety' as PunchItemCategory,
        items: [{ templateKey: 'item-living-dining-sprinkler-heads', title: 'Sprinkler heads' }],
      },
    ],
  },
  {
    area: 'A/C Closet',
    categories: [
      {
        category: 'HVAC/Ventilation' as PunchItemCategory,
        items: [
          { templateKey: 'item-ac-closet-filter', title: 'Filter' },
          { templateKey: 'item-ac-closet-heat', title: 'Heat' },
          { templateKey: 'item-ac-closet-ac', title: 'A/C' },
        ],
      },
      {
        category: 'Plumbing' as PunchItemCategory,
        items: [
          { templateKey: 'item-ac-closet-water-heater', title: 'Water heater' },
          { templateKey: 'item-ac-closet-condensate-lines', title: 'Condensate lines' },
          { templateKey: 'item-ac-closet-drip-pan', title: 'Drip pan' },
        ],
      },
    ],
  },
  {
    area: 'Patio',
    categories: [
      {
        category: 'Electrical' as PunchItemCategory,
        items: [{ templateKey: 'item-patio-globe', title: 'Globe' }],
      },
      {
        category: 'Doors & Storage' as PunchItemCategory,
        items: [{ templateKey: 'item-patio-closet-door', title: 'Closet door' }],
      },
      {
        category: 'General' as PunchItemCategory,
        items: [{ templateKey: 'item-patio-decking', title: 'Decking' }],
      },
    ],
  },
  {
    area: 'Trash',
    categories: [
      {
        category: 'General' as PunchItemCategory,
        items: [],
      },
    ],
  },
];

export function flattenPunchTemplate(template: PunchTemplateArea[]): PunchTemplateItem[] {
  return template.flatMap((area: PunchTemplateArea) =>
    area.categories.flatMap((category) =>
      category.items.map((item) => ({
        ...item,
        area: area.area,
        category: category.category,
      }))
    )
  );
}
