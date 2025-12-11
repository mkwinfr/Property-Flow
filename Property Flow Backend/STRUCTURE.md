# Backend Project Structure

## Directory Organization

```
src/
├── index.ts                    # Application entry point (Express setup)
│
├── db/
│   └── prisma.ts              # Prisma client configuration
│
├── middleware/                # Express middleware
│   ├── errorHandler.ts        # Centralized error handling
│   ├── validation.ts          # Input validation middleware
│   └── authentication.ts       # Auth verification (planned)
│
├── routes/                    # API endpoint definitions
│   ├── apartments.ts          # Apartment endpoints
│   ├── turns.ts               # Turn/punch endpoints
│   └── makeReadyBoard.ts      # Make-ready board endpoints
│
├── controllers/               # Request handling logic (planned)
│   ├── apartmentController.ts
│   ├── turnController.ts
│   └── makeReadyController.ts
│
├── services/                  # Business logic layer (planned)
│   ├── apartmentService.ts
│   ├── turnService.ts
│   └── makeReadyService.ts
│
├── types/                     # TypeScript type definitions
│   ├── apartment.ts
│   ├── turn.ts
│   ├── api.ts
│   └── common.ts
│
└── utils/                     # Utility functions
    ├── logger.ts             # Logging utility
    ├── errors.ts             # Custom error classes
    └── validators.ts         # Validation helpers

prisma/
├── schema.prisma             # Database schema definition
├── seed.ts                   # Database seeding script
├── migrations/               # Database migration history
└── waterford-units.json      # Sample data for seeding
```

## Architectural Layers

### 1. Routes (Entry Point)
Handles HTTP request routing and parameter extraction.

```typescript
router.get('/apartments/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  // Pass to controller
});
```

### 2. Controllers (Request Handling)
Parse requests, call services, format responses.

```typescript
export async function getApartmentById(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const apartment = await apartmentService.getById(id);
  res.json(apartment);
}
```

### 3. Services (Business Logic)
Contains core application logic and database queries.

```typescript
export async function getById(id: number) {
  return prisma.apartment.findUnique({
    where: { id },
    include: { property: true, workOrders: true },
  });
}
```

### 4. Database (Data Persistence)
Prisma ORM handles all database operations.

```typescript
const apartment = await prisma.apartment.findUnique({
  where: { id },
});
```

## Data Flow Example

```
Request → Route → Controller → Service → Prisma → Database
Response ← Middleware ← Controller ← Service ← Database
```

## Current vs. Recommended Structure

### Current (Routes with embedded logic)
```
src/routes/apartments.ts
├── GET / - queries database directly
├── GET /:id - queries database directly
└── Logic mixed with route definitions
```

### Recommended (Separation of concerns)
```
src/routes/apartments.ts
├── Route definitions only
└── Delegates to controller

src/controllers/apartmentController.ts
├── Request handling
└── Delegates to service

src/services/apartmentService.ts
├── Business logic
└── Uses Prisma client
```

## Best Practices

### Error Handling
```typescript
try {
  const data = await apartmentService.getById(id);
  res.json(data);
} catch (error) {
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: 'Not found' });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Input Validation
```typescript
// In middleware/validation.ts
export const validateApartmentId = (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid apartment ID' });
  }
  next();
};

// In route
router.get('/:id', validateApartmentId, getApartmentHandler);
```

### Type Safety
```typescript
// types/apartment.ts
export interface Apartment {
  id: number;
  unitNumber: string;
  building: string;
  // ... other fields
}

// In service
export async function getById(id: number): Promise<Apartment> {
  // Implementation
}
```

## Environment Configuration

See `.env.example` for required environment variables:
- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - PostgreSQL connection string

## Common Patterns

### Async/Await Pattern
```typescript
const apartments = await prisma.apartment.findMany();
return res.json(apartments);
```

### Error Classes
```typescript
class ValidationError extends Error {
  constructor(public field: string, public message: string) {
    super(`Validation error: ${field} - ${message}`);
  }
}
```

### Pagination
```typescript
const skip = (page - 1) * pageSize;
const apartments = await prisma.apartment.findMany({
  skip,
  take: pageSize,
});
```

## Testing

### Unit Test (Service)
```typescript
describe('apartmentService', () => {
  test('getById returns apartment', async () => {
    const apartment = await apartmentService.getById(1);
    expect(apartment.id).toBe(1);
  });
});
```

### Integration Test (Route)
```typescript
describe('GET /api/apartments/:id', () => {
  test('returns apartment by ID', async () => {
    const response = await request(app).get('/api/apartments/1');
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(1);
  });
});
```

## Performance Considerations

- Use Prisma `select` to fetch only needed fields
- Implement pagination for large datasets
- Cache frequently accessed data
- Use database indexes on commonly filtered columns
- Avoid N+1 queries (use `include` carefully)

## Future Improvements

- [ ] Implement authentication middleware
- [ ] Add input validation middleware
- [ ] Create centralized error handler
- [ ] Refactor routes into controllers
- [ ] Extract business logic into services
- [ ] Add logging system
- [ ] Implement rate limiting
- [ ] Add request/response caching
- [ ] Create API documentation (Swagger/OpenAPI)
- [ ] Add comprehensive test suite
