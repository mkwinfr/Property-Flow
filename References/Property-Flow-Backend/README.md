# Property Flow Backend - REST API

Express.js REST API server providing endpoints for apartment management, make-ready board coordination, and technician operations.

## Quick Start

### Installation
```bash
npm install
npm run prisma:generate
```

### Configuration
Create `.env` file:
```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/property_flow_dev
```

See `.env.example` for all options.

### Development Server
```bash
npm run dev
```

Server runs on `http://localhost:4000`

### Build
```bash
npm run build
npm run type-check
```

## API Endpoints

### Apartments
- `GET /api/apartments` - List all apartments
- `GET /api/apartments/:id` - Get apartment details

### Make-Ready Board
- `GET /api/make-ready-board` - Get board state

### Turns
- `POST /api/turns` - Create turn entry

Health check: `GET /` returns "Property Flow Backend Running"

## Project Structure

See [STRUCTURE.md](./STRUCTURE.md) for detailed organization.

### Key Directories
- `src/routes/` - API endpoint definitions
- `src/controllers/` - Request handling (planned)
- `src/services/` - Business logic (planned)
- `src/middleware/` - Request processing (planned)
- `src/types/` - TypeScript definitions
- `prisma/` - Database schema and migrations

## Database

### PostgreSQL Setup

**Requirements**: PostgreSQL 12+

**Connection String Format**:
```
postgresql://username:password@localhost:5432/database_name
```

### Migrations

Create new migration:
```bash
npm run prisma:migrate
```

Sync schema with Prisma client:
```bash
npm run prisma:generate
```

Seed with sample data:
```bash
npm run prisma:seed
```

Browse database:
```bash
npm run prisma:studio
```

## Development Guidelines

### TypeScript
- Strict mode enabled
- Explicit function return types
- All interfaces properly typed

### Code Style
```typescript
/**
 * Get apartment details
 * @param id - Apartment ID
 * @returns Apartment with relations
 */
export async function getApartmentById(id: number): Promise<Apartment> {
  // Implementation
}
```

### Error Handling (Planned)
- Use consistent ApiError class
- Include meaningful error codes
- Centralize error handling in middleware

## Environment Variables

See `.env.example` for complete list:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection | Required |

## Testing (When Added)

```bash
npm run test
npm run test:watch
npm run test:coverage
```

## Deployment

### Prepare for Production
```bash
npm run build
npm run type-check
npm run prisma:generate
```

### Start Production Server
```bash
npm start
```

Requires:
- Node.js 18+
- PostgreSQL instance
- All environment variables configured

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql postgresql://user:password@localhost:5432/database

# Verify DATABASE_URL in .env
```

### Prisma Issues
```bash
# Regenerate Prisma client
npm run prisma:generate

# Reset database (⚠️ deletes all data)
npm run prisma:migrate reset
```

### Port Already in Use
```bash
# Find process using port 4000
netstat -ano | findstr :4000

# Or change port in .env
PORT=5000
```

## Architecture

Three-tier architecture with separation of concerns:

```
Routes (HTTP) → Controllers (Requests) → Services (Logic) → Prisma (ORM) → PostgreSQL
```

## Contributing

See [DEVELOPMENT.md](./DEVELOPMENT.md) for development workflow.

## Resources

- [Express.js Docs](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
