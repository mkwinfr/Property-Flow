# TypeScript Type Definitions

Shared type definitions for API consistency and type safety.

## Structure

```
types/
├── apartment.ts        # Apartment domain types
├── turn.ts             # Turn/punch types
├── api.ts              # API request/response types
├── common.ts           # Common/shared types
├── error.ts            # Error types
└── index.ts            # Central export file
```

## Apartment Types

```typescript
// types/apartment.ts
export interface Apartment {
  id: number;
  unitNumber: string;
  building: string;
  beds: number;
  baths: number;
  status: ApartmentStatus;
  propertyId: number;
  property?: Property;
  workOrders?: WorkOrder[];
  turns?: Turn[];
  createdAt: Date;
  updatedAt: Date;
}

export type ApartmentStatus = 'vacant' | 'occupied' | 'maintenance';
```

## Turn Types

```typescript
// types/turn.ts
export interface Turn {
  id: number;
  apartmentId: number;
  startTime: Date;
  endTime?: Date;
  status: TurnStatus;
  technician: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TurnStatus = 'not-started' | 'in-progress' | 'completed';
```

## API Response Types

```typescript
// types/api.ts
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}
```

## Common Types

```typescript
// types/common.ts
export type Timestamp = Date | string;

export interface Entity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AsyncFunction<T> = () => Promise<T>;
```

## Error Types

```typescript
// types/error.ts
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: Date;
    path?: string;
    requestId?: string;
  };
}
```

## Usage in Services

```typescript
import type { Apartment, ApartmentStatus } from '@/types';

export async function getApartmentById(id: number): Promise<Apartment> {
  // Implementation with full type safety
}

export async function updateApartmentStatus(
  id: number,
  status: ApartmentStatus,
): Promise<Apartment> {
  // Implementation
}
```

## Best Practices

- ✅ Define types at module level
- ✅ Export all types for external use
- ✅ Use interfaces for object shapes
- ✅ Use type for unions and literals
- ✅ Include timestamps on entities
- ✅ Document complex types
- ❌ Don't use `any` type
- ❌ Don't put business logic in type files
- ❌ Don't create circular dependencies

## Central Export

```typescript
// types/index.ts
export type { Apartment, ApartmentStatus } from './apartment';
export type { Turn, TurnStatus } from './turn';
export type { ApiResponse, ApiError, PaginatedResponse } from './api';
export type { Entity, Timestamp } from './common';
export type { ErrorResponse } from './error';
```

This allows importing: `import type { Apartment } from '@/types';`
