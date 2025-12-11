# TypeScript Type Definitions

Shared type definitions for consistency across the application.

## Structure

```
types/
├── apartment.ts        # Apartment-related types
├── turn.ts             # Turn/punch-related types
├── api.ts              # API request/response types
├── common.ts           # Common/shared types
└── index.ts            # Re-export all types
```

## Apartment Types (apartment.ts)

```typescript
export type ApartmentStatus = 'vacant' | 'occupied' | 'maintenance';

export interface Apartment {
  id: number;
  unitNumber: string;
  building: string;
  beds: number;
  baths: number;
  status: ApartmentStatus;
  property?: Property;
  workOrders?: WorkOrder[];
  turns?: Turn[];
}

export interface ApartmentDetail extends Apartment {
  squareFeet: number;
  rent: number;
  leaseStart: Date;
  leaseEnd: Date;
  tenant?: Tenant;
}
```

## Turn Types (turn.ts)

```typescript
export type TurnStatus = 'not-started' | 'in-progress' | 'completed';

export interface Turn {
  id: number;
  apartmentId: number;
  startTime: Date;
  endTime?: Date;
  status: TurnStatus;
  technician: string;
  notes?: string;
}
```

## API Types (api.ts)

```typescript
export interface ApiResponse<T> {
  data?: T;
  error?: string;
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
}
```

## Common Types (common.ts)

```typescript
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  state: LoadingState;
  data?: T;
  error?: Error;
}

export type ReactFCWithChildren = React.FC<{ children: React.ReactNode }>;
```

## Usage in Components

```typescript
import type { Apartment, ApartmentStatus } from '@/types';

interface ApartmentCardProps {
  apartment: Apartment;
  onStatusChange: (status: ApartmentStatus) => void;
}

const ApartmentCard: React.FC<ApartmentCardProps> = ({ apartment, onStatusChange }) => {
  // Component implementation
};
```

## Best Practices

- ✅ Define types at the top of files
- ✅ Use `interface` for object shapes
- ✅ Use `type` for unions and tuples
- ✅ Export types for external use
- ✅ Keep types close to usage
- ✅ Document complex types with JSDoc
- ❌ Don't use `any` type
- ❌ Don't put implementation in type files
- ❌ Avoid circular type dependencies

## Re-exporting (index.ts)

```typescript
// types/index.ts - centralized export
export type { Apartment, ApartmentStatus, ApartmentDetail } from './apartment';
export type { Turn, TurnStatus } from './turn';
export type { ApiResponse, ApiError } from './api';
export type { LoadingState, AsyncState } from './common';
```

## Testing Types

```typescript
import type { Apartment } from './apartment';

// Factory function for tests
export function createMockApartment(overrides?: Partial<Apartment>): Apartment {
  return {
    id: 1,
    unitNumber: '101',
    building: 'A',
    beds: 2,
    baths: 1,
    status: 'vacant',
    ...overrides,
  };
}
```
