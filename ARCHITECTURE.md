# Architecture Overview

## System Design

Property Flow follows a modern three-tier architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/PWA)                      │
│           (property-flow-tech)                              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                Backend (Express API)                         │
│           (property-flow-backend)                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Routes → Controllers → Services → Prisma ORM        │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ SQL
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                           │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Component Structure

```
pages/                    # Full-page components with routing
├── Dashboard/           # Main application shell
├── ApartmentDetail/     # Apartment information display
├── MakeReadyBoard/      # Make-ready task management
├── StartPunch/          # Clock in/out interface
└── Settings/            # User settings

components/
├── AppDrawer/          # Navigation drawer
├── Dock/               # Bottom navigation bar
└── SplashScreen/       # Startup animation

hooks/                   # Custom React hooks (planned)
├── useApartments       # Apartment data fetching
├── useTurns            # Turn/punch data
└── useAuth             # Authentication state

utils/                   # Helper functions (planned)
├── api.ts              # API client methods
├── format.ts           # Data formatting
└── validate.ts         # Input validation

types/                   # TypeScript definitions (planned)
├── apartment.ts        # Apartment interfaces
├── turn.ts             # Turn/punch types
└── api.ts              # API response types
```

### State Management

Currently uses React's built-in state (`useState`). For scalability, consider:
- Context API for global state (user, settings)
- Zustand or Redux for complex state management
- React Query for server state and caching

### Styling Architecture

CSS follows a layered approach:

1. **tokens.css** - Design tokens (colors, fonts, sizes)
2. **base.css** - Global reset, app shell styles
3. **utilities.css** - Reusable utility classes
4. **components.css** - Component-specific styles
5. **pages.css** - Page layout styles
6. **typography.css** - Font families and text scales
7. **animations.css** - Keyframe animations and transitions

Each layer is imported in order in `main.tsx` to ensure proper cascade.

### Design System

Uses custom CSS variables from `tokens.css`:
- **Colors**: Navy, ink, cream, coral (brand colors)
- **Typography**: Montserrat (headings), Nunito Sans (body)
- **Spacing**: 4px base unit (4, 8, 12, 16, 20, 24...)
- **Theme**: Dark mode optimized for field work

## Backend Architecture

### Route Handlers

Currently located in `src/routes/`, routes handle:
- Request parsing and validation (TODO)
- Prisma query execution
- Response formatting and error handling

**Improvement Path**: Separate into Controllers (request handling) + Services (business logic)

```
Request → Route → Controller → Service → Prisma → Database
Response ← Middleware ← Service ← Database
```

### Middleware Stack

Applied in `index.ts`:
1. `express.json()` - Parse JSON bodies
2. `cors()` - Enable cross-origin requests
3. `morgan("dev")` - Log HTTP requests
4. Routes registration
5. Error handler (TODO - not implemented)

**Missing**: Request validation, error handling, authentication

### Database Layer

Uses Prisma ORM for type-safe database access:

```prisma
model Apartment {
  id      Int
  unitNumber String
  status  Status
  property Property
  workOrders WorkOrder[]
  turns    Turn[]
}
```

**Improvements**:
- Add repository pattern for data access
- Implement database transactions
- Add connection pooling configuration
- Document schema relationships

### API Design

RESTful endpoints following standard conventions:

```
GET    /api/apartments           # List all
GET    /api/apartments/:id       # Get one
POST   /api/apartments           # Create (TODO)
PUT    /api/apartments/:id       # Update (TODO)
DELETE /api/apartments/:id       # Delete (TODO)

GET    /api/make-ready-board     # Get board state
POST   /api/turns                # Create turn entry
```

**Standards**:
- Use HTTP status codes correctly
- Return consistent JSON structures
- Include error messages in responses
- Validate all inputs
- Add request/response logging

## Data Flow Examples

### Apartment Detail Flow

1. **Frontend**: User clicks apartment in list
2. **Frontend**: Component requests `GET /api/apartments/:id`
3. **Backend**: Route receives request, validates ID parameter
4. **Backend**: Queries Prisma for apartment with relations
5. **Backend**: Returns apartment object with workOrders, turns, property
6. **Frontend**: Receives data, updates component state
7. **Frontend**: Renders apartment details with related items

### Make-Ready Board Flow

1. **Frontend**: Dashboard renders MakeReadyBoard component
2. **Frontend**: useEffect fetches `GET /api/make-ready-board`
3. **Backend**: Queries Prisma for apartments + recent workOrders/turns
4. **Backend**: Formats response with status summaries
5. **Frontend**: Maps data into sortable/filterable board view
6. **Frontend**: User drags card to new status
7. **Frontend**: Sends PATCH request to update status
8. **Backend**: Validates and updates database
9. **Frontend**: Refetches board state or updates optimistically

## Error Handling

**Current State**: Basic try/catch in routes

**Should Be**:
- Centralized error handler middleware
- Consistent error response format
- Proper HTTP status codes
- Request ID tracking for debugging
- Logging of all errors

## Security Considerations

- CORS configured but should be restricted to known domains
- No authentication/authorization (TODO)
- No rate limiting (TODO)
- No input validation (TODO)
- Use environment variables for sensitive config
- Validate all user inputs
- Sanitize database queries (Prisma prevents SQL injection)

## Testing Strategy

**Recommended**:
- **Unit tests**: Business logic in services
- **Integration tests**: Database interactions via Prisma
- **API tests**: Endpoint validation
- **E2E tests**: Full user flows in frontend

**Tools to consider**:
- Jest (testing framework)
- Supertest (HTTP assertion)
- Testing Library (React component testing)
- Cypress (E2E testing)

## Deployment Architecture

### Frontend
- Built as static PWA
- Can be deployed to: Netlify, Vercel, AWS S3+CloudFront
- Service worker enables offline functionality
- Current build: `npm run build` → `dist/` directory

### Backend
- Node.js server
- Can be deployed to: Heroku, AWS EC2, Railway, Fly.io
- Requires Node 18+, npm, environment variables
- Database connection via Prisma (requires PostgreSQL)

## Performance Optimizations

### Frontend
- Lazy load routes with React Router
- Image optimization for camera app
- Service worker for offline capability
- CSS splitting by page

### Backend
- Implement database connection pooling
- Add query result caching
- Pagination for list endpoints
- Efficient Prisma queries (avoid N+1)

## Future Considerations

1. **Real-time updates**: WebSocket for live make-ready board
2. **Authentication**: JWT or similar
3. **File uploads**: Images from camera for documentation
4. **Search/filtering**: Full-text search on apartments
5. **Mobile app**: React Native version of tech app
6. **Admin dashboard**: Separate admin interface
7. **Analytics**: Track technician productivity
8. **Notifications**: Push notifications for status updates
