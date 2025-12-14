# Utility Functions

Pure functions for data transformation, formatting, validation, and API calls.

## Structure

```
utils/
├── api.ts              # API client and fetch helpers
├── format.ts           # Data formatting (dates, currency, etc)
├── validate.ts         # Input validation
└── constants.ts        # Application constants
```

## Categories

### API Utils (api.ts)

Handle all HTTP requests:

```typescript
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:4000/api';

export async function fetchApartments() {
  const response = await fetch(`${API_BASE_URL}/apartments`);
  if (!response.ok) throw new Error('Failed to fetch apartments');
  return response.json();
}

export async function fetchApartmentById(id: number) {
  const response = await fetch(`${API_BASE_URL}/apartments/${id}`);
  if (!response.ok) throw new Error('Failed to fetch apartment');
  return response.json();
}
```

### Format Utils (format.ts)

Transform data for display:

```typescript
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}
```

### Validation Utils (validate.ts)

Check input validity:

```typescript
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhoneNumber(phone: string): boolean {
  return /^\d{10}$/.test(phone.replace(/\D/g, ''));
}

export function isEmptyString(str: string): boolean {
  return str.trim().length === 0;
}
```

## Best Practices

- ✅ Keep functions pure (same input = same output)
- ✅ Use TypeScript for type safety
- ✅ Document with JSDoc
- ✅ Name functions descriptively
- ✅ Group related functions in files
- ❌ Don't perform side effects in utils
- ❌ Don't import React or components
- ❌ Don't use global state

## Testing Utils

```typescript
import { formatDate, formatCurrency } from './format';

describe('format utils', () => {
  test('formatDate formats correctly', () => {
    const date = new Date('2025-12-10');
    expect(formatDate(date)).toBe('12/10/2025');
  });

  test('formatCurrency adds dollar sign', () => {
    expect(formatCurrency(100)).toContain('$');
  });
});
```

## Constants (constants.ts)

```typescript
export const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:4000/api';

export const APARTMENT_STATUS = {
  VACANT: 'vacant',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
} as const;

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  APARTMENTS: '/apartments',
  SETTINGS: '/settings',
} as const;
```
