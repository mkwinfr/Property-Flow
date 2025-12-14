# API Services

Service layer for backend API communication and data operations.

## Structure

```
services/
├── apartmentService.ts   # Apartment API calls
├── turnService.ts        # Turn/punch API calls
└── makeReadyService.ts   # Make-ready board operations
```

## Benefits

- Centralized API calls
- Easy to mock in tests
- Reusable across components
- Error handling in one place

## Example: ApartmentService

```typescript
import type { Apartment } from '@/types';

class ApartmentService {
  private baseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

  /**
   * Fetch all apartments
   */
  async getApartments(): Promise<Apartment[]> {
    const response = await fetch(`${this.baseUrl}/apartments`);
    if (!response.ok) throw new Error('Failed to fetch apartments');
    return response.json();
  }

  /**
   * Fetch single apartment by ID
   */
  async getApartmentById(id: number): Promise<Apartment> {
    const response = await fetch(`${this.baseUrl}/apartments/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch apartment ${id}`);
    return response.json();
  }

  /**
   * Create new apartment
   */
  async createApartment(data: Partial<Apartment>): Promise<Apartment> {
    const response = await fetch(`${this.baseUrl}/apartments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create apartment');
    return response.json();
  }

  /**
   * Update apartment
   */
  async updateApartment(id: number, data: Partial<Apartment>): Promise<Apartment> {
    const response = await fetch(`${this.baseUrl}/apartments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update apartment');
    return response.json();
  }

  /**
   * Delete apartment
   */
  async deleteApartment(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/apartments/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete apartment');
  }
}

export const apartmentService = new ApartmentService();
```

## Usage in Hooks

```typescript
import { apartmentService } from '@/services';

export function useApartments() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apartmentService
      .getApartments()
      .then(setApartments)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { apartments, loading, error };
}
```

## Best Practices

- ✅ Create singleton instances for services
- ✅ Use consistent naming (Service suffix)
- ✅ Document all methods with JSDoc
- ✅ Include error handling
- ✅ Use TypeScript for type safety
- ✅ Keep HTTP logic separate from React
- ❌ Don't use React hooks in services
- ❌ Don't use global state in services
- ❌ Don't make services browser-specific

## Testing Services

```typescript
import { apartmentService } from './apartmentService';

// Mock the global fetch
global.fetch = jest.fn();

describe('ApartmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getApartments fetches all apartments', async () => {
    const mockData = [{ id: 1, unitNumber: '101' }];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await apartmentService.getApartments();
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/apartments'));
  });
});
```
