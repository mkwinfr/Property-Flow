# Property Flow

A comprehensive property management platform with real-time technician field operations, make-ready board coordination, and apartment inventory tracking.

## Workspace Structure

This is a monorepo containing three main applications:

- **property-flow-backend** - Express.js REST API server (TypeScript, Prisma ORM)
- **property-flow-tech** - React field technician mobile web app (TypeScript, Vite, PWA)
- **property-flow-desktop** - Desktop management application (in development)

## Quick Start

### Prerequisites
- Node.js 18+ (recommended: 20 LTS)
- npm 9+
- PostgreSQL (for backend database)

### Development Environment

Run the launch script to start both frontend and backend:

```bash
./Start.bat          # Windows
./start.sh           # Linux/Mac (if added)
```

This opens Windows Terminal with two panes:
- Left: Backend running on `http://localhost:4000`
- Right: Frontend running on `http://localhost:5173`

### Individual Setup

**Backend:**
```bash
cd property-flow-backend
npm install
npm run prisma:generate
npm run dev
```

**Frontend:**
```bash
cd property-flow-tech
npm install
npm run dev
```

## Project Structure

```
property-flow-backend/
├── src/
│   ├── index.ts              # Express app setup
│   ├── db/                   # Database layer
│   ├── routes/               # API endpoints
│   └── middleware/           # Request processing
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Database seeding
└── package.json

property-flow-tech/
├── src/
│   ├── main.tsx              # Application entry
│   ├── components/           # Reusable UI components
│   ├── pages/                # Page-level components
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript interfaces
│   └── styles/               # Global CSS
├── index.html                # HTML entry point
└── package.json
```

## Development Guidelines

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Type-aware rules, React best practices
- **Formatting**: Consistent indentation and naming conventions
- Component names use PascalCase, variables use camelCase

### Git Workflow
- Branch naming: `feature/feature-name`, `fix/issue-name`, `refactor/task`
- Commit messages should be descriptive and concise
- Create PRs for all changes before merging to main

### Environment Variables
See `.env.example` files in each directory for required configuration.

## API Documentation

The backend exposes the following main endpoints:

- `GET /` - Health check
- `GET /api/apartments` - List all apartments
- `GET /api/apartments/:id` - Get apartment details
- `GET /api/make-ready-board` - Get make-ready board data
- `POST /api/turns` - Create/update turn entries

See backend README for full API specification.

## Tech Stack

### Frontend
- React 19
- TypeScript 5.9
- Vite (build tool)
- React Router 7
- Lucide React (icons)
- PWA support

### Backend
- Express 5
- TypeScript 5.9
- Prisma 6 (ORM)
- PostgreSQL
- CORS enabled
- Morgan (logging)

## Contributing

1. Create a feature branch from `main`
2. Make your changes following code style guidelines
3. Test thoroughly before submitting PR
4. Ensure all linting passes: `npm run lint`
5. Request review from team members

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify `.env` has correct DATABASE_URL
- Run `npm run prisma:generate` to sync schema
- Check port 4000 isn't already in use

### Frontend build issues
- Clear node_modules: `rm -r node_modules && npm install`
- Clear vite cache: `rm -r node_modules/.vite`
- Check TypeScript errors: `npm run tsc --noEmit`

### Database migrations
```bash
cd property-flow-backend
npm run prisma:migrate    # Create new migration
npm run prisma:generate   # Sync schema with Prisma client
npm run prisma:seed       # Populate with seed data
```

## License

ISC

## Support

For issues or questions, please open a GitHub issue or contact the development team.
