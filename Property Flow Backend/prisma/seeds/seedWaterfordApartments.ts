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
}

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Parse rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    header.forEach((key, index) => {
      row[key] = values[index] || '';
    });
    rows.push(row as CSVRow);
  }
  
  return rows;
}

export async function seedWaterfordApartments() {
  console.log('🏘️  Seeding Waterford Landings apartments from CSV...');

  // Read CSV
  const csvPath = path.join(__dirname, '..', '..', '..', '..', '..', 'Downloads', 'Units1766033793.csv');
  const apartments = parseCSV(csvPath);

  // Get the Waterford Landings property and default building
  const property = await prisma.property.findFirst({
    where: { name: 'Waterford Landings' }
  });

  if (!property) {
    throw new Error('Waterford Landings property not found. Run main seed first.');
  }

  // Get or create a default building for apartments without building assignment
  let defaultBuilding = await prisma.building.findFirst({
    where: {
      propertyId: property.id,
      buildingNumber: '1'
    }
  });

  if (!defaultBuilding) {
    defaultBuilding = await prisma.building.create({
      data: {
        propertyId: property.id,
        buildingNumber: '1',
        name: 'Main Building'
      }
    });
  }

  // Get all floor plans for lookup
  const floorPlans = await prisma.floorPlan.findMany();
  const floorPlanMap = new Map(floorPlans.map(fp => [fp.name, fp.id]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const apt of apartments) {
    try {
      const floorPlanId = floorPlanMap.get(apt.Floorplan);
      
      if (!floorPlanId) {
        console.warn(`⚠️  Floor plan not found: ${apt.Floorplan} for unit ${apt.Unit}`);
        skipped++;
        continue;
      }

      const minRent = parseFloat(apt['Min Rent']) || 0;
      const maxRent = parseFloat(apt['Max Rent']) || 0;
      const beds = parseInt(apt.Beds) || 0;
      const baths = parseInt(apt.Baths) || 0;

      const existing = await prisma.apartment.findFirst({
        where: {
          propertyId: property.id,
          unitNumber: apt.Unit
        }
      });

      if (existing) {
        // Update existing apartment
        await prisma.apartment.update({
          where: { id: existing.id },
          data: {
            floorPlanId,
            property: apt.Property,
            minRent,
            maxRent,
            beds,
            baths,
          }
        });
        updated++;
      } else {
        // Create new apartment
        await prisma.apartment.create({
          data: {
            propertyId: property.id,
            buildingId: defaultBuilding.id,
            unitNumber: apt.Unit,
            property: apt.Property,
            floorPlanId,
            minRent,
            maxRent,
            beds,
            baths,
            status: 'OCCUPIED', // Default status
          }
        });
        created++;
      }
    } catch (error) {
      console.error(`Error processing unit ${apt.Unit}:`, error);
      skipped++;
    }
  }

  console.log(`✅ Waterford apartments processed:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${apartments.length}`);
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
