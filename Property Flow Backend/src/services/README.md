# Services Layer

Business logic layer that encapsulates domain operations and database interactions.

## Structure

```
services/
├── apartmentService.ts    # Apartment business logic
├── turnService.ts         # Turn/punch operations
├── makeReadyService.ts    # Make-ready board logic
└── baseService.ts         # Common service patterns (optional)
```

## Service Pattern

Services handle:
- Database queries via Prisma
- Business logic and calculations
- Data transformations
- Error handling

Services DON'T:
- Handle HTTP requests
- Parse request parameters
- Send HTTP responses
- Access req/res objects

## Example: Apartment Service

```typescript
// services/apartmentService.ts
import { prisma } from '@/db/prisma';
import type { Apartment, ApartmentStatus } from '@/types';
import { ApiError } from '@/middleware/errorHandler';

export class ApartmentService {
  /**
   * Get all apartments with pagination
   */
  async getAll(page: number = 1, pageSize: number = 20): Promise<{
    items: Apartment[];
    total: number;
  }> {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.apartment.findMany({
        skip,
        take: pageSize,
        orderBy: { unitNumber: 'asc' },
      }),
      prisma.apartment.count(),
    ]);

    return { items, total };
  }

  /**
   * Get apartment by ID with relations
   */
  async getById(id: number): Promise<Apartment> {
    const apartment = await prisma.apartment.findUnique({
      where: { id },
      include: {
        property: true,
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        turns: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!apartment) {
      throw new ApiError(404, 'NOT_FOUND', `Apartment ${id} not found`);
    }

    return apartment;
  }

  /**
   * Update apartment status
   */
  async updateStatus(id: number, status: ApartmentStatus): Promise<Apartment> {
    const apartment = await prisma.apartment.update({
      where: { id },
      data: { status },
      include: { property: true },
    });

    return apartment;
  }

  /**
   * Get apartments by status
   */
  async getByStatus(status: ApartmentStatus): Promise<Apartment[]> {
    return prisma.apartment.findMany({
      where: { status },
      orderBy: { unitNumber: 'asc' },
    });
  }
}

export const apartmentService = new ApartmentService();
```

## Controller Using Service

```typescript
// controllers/apartmentController.ts
import { Request, Response } from 'express';
import { apartmentService } from '@/services/apartmentService';

export async function getApartments(req: Request, res: Response) {
  const { page = '1', pageSize = '20' } = req.query;
  const result = await apartmentService.getAll(
    parseInt(page as string),
    parseInt(pageSize as string),
  );
  res.json(result);
}

export async function getApartmentById(req: Request, res: Response) {
  const { id } = req.params;
  const apartment = await apartmentService.getById(parseInt(id));
  res.json(apartment);
}

export async function updateApartmentStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;
  const apartment = await apartmentService.updateStatus(parseInt(id), status);
  res.json(apartment);
}
```

## Route Using Controller

```typescript
// routes/apartments.ts
import express from 'express';
import { getApartments, getApartmentById, updateApartmentStatus } from '@/controllers/apartmentController';
import { validateId } from '@/middleware/validation';

const router = express.Router();

router.get('/', getApartments);
router.get('/:id', validateId, getApartmentById);
router.patch('/:id/status', validateId, updateApartmentStatus);

export default router;
```

## Common Service Methods

```typescript
// baseService.ts - Optional base class
import { ApiError } from '@/middleware/errorHandler';

export abstract class BaseService<T> {
  protected abstract model: any;

  async getById(id: number): Promise<T> {
    const item = await this.model.findUnique({ where: { id } });
    if (!item) {
      throw new ApiError(404, 'NOT_FOUND', 'Resource not found');
    }
    return item;
  }

  async getAll(page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.model.findMany({ skip, take: pageSize }),
      this.model.count(),
    ]);
    return { items, total };
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create({ data });
  }

  async update(id: number, data: Partial<T>): Promise<T> {
    return this.model.update({ where: { id }, data });
  }

  async delete(id: number): Promise<T> {
    return this.model.delete({ where: { id } });
  }
}
```

## Best Practices

- ✅ Make services responsible for business logic
- ✅ Use dependency injection or singletons
- ✅ Return typed data (use TypeScript interfaces)
- ✅ Handle errors explicitly
- ✅ Include comprehensive JSDoc
- ✅ Make methods focused and single-purpose
- ✅ Use transactions for multi-step operations
- ❌ Don't accept req/res in services
- ❌ Don't throw HTTP errors from services (use custom errors)
- ❌ Don't directly access HTTP headers
- ❌ Don't create side effects

## Testing Services

```typescript
import { apartmentService } from './apartmentService';
import { prisma } from '@/db/prisma';

jest.mock('@/db/prisma');

describe('ApartmentService', () => {
  describe('getById', () => {
    test('returns apartment when found', async () => {
      const mockApartment = { id: 1, unitNumber: '101' };
      (prisma.apartment.findUnique as jest.Mock).mockResolvedValue(mockApartment);

      const result = await apartmentService.getById(1);

      expect(result).toEqual(mockApartment);
      expect(prisma.apartment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    test('throws NotFoundError when apartment not found', async () => {
      (prisma.apartment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(apartmentService.getById(999)).rejects.toThrow();
    });
  });
});
```

## Performance Considerations

- Use `.select()` to fetch only needed fields
- Use `.include()` strategically to avoid N+1 queries
- Implement pagination for large result sets
- Cache frequently accessed data
- Use transactions for consistency in multi-step operations
- Profile queries with Prisma metrics
