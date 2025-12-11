# Middleware Layer

Express middleware for cross-cutting concerns like error handling, validation, logging, and authentication.

## Structure

```
middleware/
├── errorHandler.ts      # Centralized error handling
├── validation.ts        # Input validation
├── authentication.ts    # JWT/auth verification (planned)
├── logging.ts           # Request/response logging
└── cors.ts              # CORS configuration
```

## Error Handler Middleware

Centralized error handling for consistent error responses.

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import type { ErrorResponse } from '@/types';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const timestamp = new Date();
  const path = req.path;
  const requestId = req.headers['x-request-id'] as string;

  if (error instanceof ApiError) {
    const response: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        timestamp,
        path,
        requestId,
      },
    };
    return res.status(error.statusCode).json(response);
  }

  // Unhandled error
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      statusCode: 500,
      timestamp,
      path,
      requestId,
    },
  });
}
```

## Validation Middleware

Validate request parameters and body data.

```typescript
// middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

export function validateId(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId < 1) {
    throw new ApiError(400, 'INVALID_ID', 'Invalid ID parameter');
  }

  req.params.id = numId.toString();
  next();
}

export function validatePageQuery(req: Request, res: Response, next: NextFunction) {
  const { page = '1', pageSize = '20' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const pageSizeNum = parseInt(pageSize as string, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    throw new ApiError(400, 'INVALID_PAGE', 'Page must be >= 1');
  }

  if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
    throw new ApiError(400, 'INVALID_PAGE_SIZE', 'Page size must be between 1 and 100');
  }

  res.locals.page = pageNum;
  res.locals.pageSize = pageSizeNum;
  next();
}
```

## Authentication Middleware (Planned)

```typescript
// middleware/authentication.ts
import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'admin' | 'technician' | 'user';
  };
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    throw new ApiError(401, 'MISSING_TOKEN', 'Authorization token required');
  }

  try {
    // Verify JWT token
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    throw new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token');
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      throw new ApiError(403, 'INSUFFICIENT_PERMISSIONS', 'Insufficient permissions');
    }
    next();
  };
}
```

## Logging Middleware

```typescript
// middleware/logging.ts
import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = generateRequestId();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${requestId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
    );
  });

  res.setHeader('X-Request-ID', requestId);
  next();
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

## Usage in index.ts

```typescript
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logging';

const app = express();

// Middleware stack
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/apartments', apartmentRoutes);

// Error handling (must be last)
app.use(errorHandler);

export default app;
```

## Best Practices

- ✅ Apply middleware in correct order
- ✅ Use error handler last
- ✅ Keep middleware focused on single concern
- ✅ Pass data via `res.locals`
- ✅ Throw errors for error handler to catch
- ✅ Include request ID for debugging
- ❌ Don't modify request/response directly
- ❌ Don't catch errors in middleware
- ❌ Don't have duplicate middleware

## Testing Middleware

```typescript
import { errorHandler } from './errorHandler';

describe('errorHandler', () => {
  test('returns 404 for NotFoundError', () => {
    const error = new ApiError(404, 'NOT_FOUND', 'Resource not found');
    const req = {} as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    errorHandler(error, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalled();
  });
});
```
