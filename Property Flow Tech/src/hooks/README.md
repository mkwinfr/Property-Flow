# Custom React Hooks

Custom hooks encapsulate reusable logic for data fetching, state management, and side effects.

## Structure

Each hook should be a single file (or directory with index.ts if complex):

```
hooks/
├── useApartments.ts      # Fetch and manage apartment data
├── useTurns.ts           # Fetch and manage turn/punch data
├── useAuth.ts            # Authentication state
└── useLocalStorage.ts    # Persist data to localStorage
```

## Hook Conventions

### Naming
- Always start with `use` prefix
- Use descriptive names: `useApartments`, `useFetchData`, `useLocalStorage`

### Structure
```typescript
/**
 * Hook description
 * @param args - Arguments if any
 * @returns State and functions
 */
export function useYourHook(args?: any) {
  const [state, setState] = useState(initialState);
  
  useEffect(() => {
    // Side effects here
  }, [/* dependencies */]);
  
  return { state, setState };
}
```

## Example: useApartments Hook

```typescript
interface Apartment {
  id: number;
  unitNumber: string;
  status: string;
}

export function useApartments() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApartments();
  }, []);

  const fetchApartments = async () => {
    try {
      const response = await fetch('/api/apartments');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setApartments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { apartments, loading, error, refetch: fetchApartments };
}
```

## Best Practices

- ✅ Keep hooks focused on a single concern
- ✅ Return object with named values for easy destructuring
- ✅ Include error states and loading states
- ✅ Use TypeScript for type safety
- ✅ Document with JSDoc comments
- ❌ Don't use conditional hooks
- ❌ Don't call hooks in loops or conditions
- ❌ Don't use hooks in regular functions

## Testing Hooks

Use `@testing-library/react-hooks`:

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useApartments } from './useApartments';

test('fetches apartments on mount', async () => {
  const { result } = renderHook(() => useApartments());
  
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  
  expect(result.current.apartments).toHaveLength(5);
});
```
