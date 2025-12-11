# Backend Development Guide

## Project Setup

### Prerequisites
- Node.js 18+ (recommended: 20 LTS)
- npm 9+
- PostgreSQL 12+

### Installation

```bash
cd property-flow-backend
npm install
npm run prisma:generate
```

### Environment Configuration

1. Copy `.env.example` to `.env`
2. Configure `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/property_flow_dev
   ```
3. Start PostgreSQL if needed

### Development Server

```bash
npm run dev
```

Server runs on `http://localhost:4000`

## Database Management

### Create Migration
```bash
npm run prisma:migrate
# Follow prompts to name migration
```

### Sync Schema with Client
```bash
npm run prisma:generate
```

### Seed Database
```bash
npm run prisma:seed
```

### View Database UI
```bash
npm run prisma:studio
```

## Building

### Development Build
```bash
npm run build
```

### Type Checking
```bash
npm run type-check
```

## API Endpoints

### Apartments
- `GET /api/apartments` - List all apartments
- `GET /api/apartments/:id` - Get apartment details

### Make-Ready Board
- `GET /api/make-ready-board` - Get board state

### Turns
- `GET /api/turns` - List turns
- `POST /api/turns` - Create turn

## Code Style

### TypeScript
- Strict mode enabled
- Explicit return types required on functions
- Use interfaces for object shapes
- Avoid `any` type

### Naming Conventions
- **Files**: camelCase (`apartmentService.ts`)
- **Functions**: camelCase (`getApartmentById`)
- **Classes**: PascalCase (`ApartmentService`)
- **Interfaces**: PascalCase (`ApartmentData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RESULTS = 100`)

### Example Function

```typescript
/**
 * Fetches apartment with related data
 * @param id - Apartment ID
 * @returns Promise containing apartment data
 * @throws NotFoundError if apartment doesn't exist
 */
export async function getApartmentById(id: number): Promise<Apartment> {
  const apartment = await prisma.apartment.findUnique({
    where: { id },
    include: {
      property: true,
      workOrders: { take: 20 },
      turns: { take: 20 },
    },
  });

  if (!apartment) {
    throw new NotFoundError(`Apartment ${id} not found`);
  }

  return apartment;
}
```

## Error Handling

### Creating Custom Errors
```typescript
// utils/errors.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, message);
    this.name = 'NotFoundError';
  }
}
```

### Using in Routes
```typescript
try {
  const apartment = await getApartmentById(id);
  res.json(apartment);
} catch (error) {
  if (error instanceof NotFoundError) {
    res.status(error.status).json({ error: error.message });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Database Schema

View the schema in `prisma/schema.prisma`. Key entities:

- **Apartment** - Individual unit
- **Property** - Building/complex
- **WorkOrder** - Maintenance tasks
- **Turn** - Occupant change events
- **Tenant** - Resident information

## Testing

Running tests (when added):
```bash
npm run test
npm run test:watch
npm run test:coverage
```

## Debugging

### Enable Logs
```typescript
// In index.ts
import { logger } from './utils/logger';

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});
```

### Database Queries
Use Prisma Studio to test queries:
```bash
npm run prisma:studio
```

## Performance Optimization

### Query Optimization
```typescript
// ❌ Bad: N+1 query problem
const apartments = await prisma.apartment.findMany();
for (const apt of apartments) {
  apt.property = await prisma.property.findUnique({
    where: { id: apt.propertyId },
  });
}

// ✅ Good: Single efficient query
const apartments = await prisma.apartment.findMany({
  include: { property: true },
});
```

### Pagination
```typescript
const pageSize = 20;
const page = req.query.page ? parseInt(req.query.page as string) : 1;
const skip = (page - 1) * pageSize;

const apartments = await prisma.apartment.findMany({
  skip,
  take: pageSize,
});
```

## Deployment Preparation

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] Environment variables documented in `.env.example`
- [ ] Database migrations run successfully
- [ ] API endpoints documented
- [ ] Error handling implemented
- [ ] Logging configured

### Build for Production
```bash
npm run build
npm start
```

## Troubleshooting

### Common Issues

**PostgreSQL connection error**
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Verify database exists

**Migration conflicts**
- Reset with: `npm run prisma:migrate reset`
- This will lose data - use only in development!

**TypeScript errors**
```bash
npm run type-check
```

**Port already in use**
- Check what's using port 4000: `netstat -ano | findstr :4000`
- Change PORT in `.env`

## Resources

- [Express.js Docs](https://expressjs.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
