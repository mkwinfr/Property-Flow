import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CSVRow {
  Unit: string;
  Property: string;
  Floorplan: string;
  Beds: string;
  Baths: string;
  'Min Rent': string;
  'Max Rent': string;
  'Ready On': string;
  'Active On': string;
  'Lock ID': string;
  'Waitlist Unit': string;
  'Model Unit': string;
}

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Parse rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    const row: any = {};
    headers.forEach((key, index) => {
      row[key] = values[index] || '';
    });
    rows.push(row as CSVRow);
  }

  return rows;
}

export async function seedWaterfordApartments() {
  console.log('🏘️  Seeding Waterford Landings apartments from CSV...');

  // Try multiple possible paths for the CSV
  const possiblePaths = [
    path.join(process.env.USERPROFILE || '', 'Downloads', 'Units1765757963.csv'),
    path.join(process.env.USERPROFILE || '', 'Downloads', 'Units*.csv'),
    'Units1765757963.csv',
  ];

  let csvPath: string | null = null;
  for (const p of possiblePaths) {
    if (p.includes('*')) {
      // Skip glob patterns for now
      continue;
    }
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (!csvPath) {
    console.warn('⚠️  CSV file not found, skipping Waterford apartments');
    return;
  }

  console.log(`📄 Reading CSV from: ${csvPath}`);
  const apartments = parseCSV(csvPath);
  console.log(`📋 Found ${apartments.length} apartments in CSV`);

  // Get the Waterford Landings property
  const property = await prisma.property.findFirst({
    where: { name: 'Waterford Landings' }
  });

  if (!property) {
    console.warn('⚠️  Waterford Landings property not found, skipping apartment details');
    return;
  }

  // Get all floor plans for lookup
  const floorPlans = await prisma.floorPlan.findMany();
  const floorPlanMap = new Map(floorPlans.map(fp => [fp.name, fp]));

  let updated = 0;
  let skipped = 0;

  for (const row of apartments) {
    try {
      const beds = parseInt(row.Beds) || 0;
      const baths = parseInt(row.Baths) || 0;
      const minRent = parseFloat(row['Min Rent']) || 0;
      const maxRent = parseFloat(row['Max Rent']) || 0;
      const floorPlanName = row.Floorplan.trim();

      // Find apartment
      const apartment = await prisma.apartment.findFirst({
        where: {
          propertyId: property.id,
          unitNumber: row.Unit.trim()
        }
      });

      if (!apartment) {
        console.warn(`⚠️  Apartment ${row.Unit} not found`);
        skipped++;
        continue;
      }

      // Find matching floor plan
      let floorPlanId = null;
      const matchingFloorPlan = floorPlanMap.get(floorPlanName);
      if (matchingFloorPlan) {
        floorPlanId = matchingFloorPlan.id;
      } else {
        console.warn(`⚠️  Floor plan "${floorPlanName}" not found for unit ${row.Unit}`);
      }

      // Update apartment
      await prisma.apartment.update({
        where: { id: apartment.id },
        data: {
          beds,
          baths,
          minRent,
          maxRent,
          floorPlanId,
        }
      });
      updated++;
    } catch (error) {
      console.error(`Error processing unit ${row.Unit}:`, error);
      skipped++;
    }
  }

  console.log(`✅ Updated ${updated} apartments`);
  if (skipped > 0) {
    console.log(`⚠️  Skipped ${skipped} apartments`);
  }
}

// Run if called directly
if (require.main === module) {
  seedWaterfordApartments()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
