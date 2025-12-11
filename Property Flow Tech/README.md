# Property Flow Tech - Frontend Application

A field technician mobile web application (PWA) for managing apartment turnovers, make-ready boards, and property operations in real-time.

## Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

Server runs on `http://localhost:5173`

### Building
```bash
npm run build
npm run preview
```

## Project Structure

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed organization.

### Key Directories
- `src/pages/` - Full-page components (Dashboard, ApartmentDetail, etc)
- `src/components/` - Reusable UI components (Dock, AppDrawer, etc)
- `src/hooks/` - Custom React hooks (planned)
- `src/utils/` - Helper functions (planned)
- `src/types/` - TypeScript definitions (planned)
- `src/styles/` - Global CSS organized by layer

## Development Guidelines

### TypeScript
- Strict mode enabled
- Explicit return types required
- Use interfaces for props

### Component Structure
```typescript
import { useState } from 'react';
import type { ComponentProps } from '@/types';

interface MyComponentProps {
  title: string;
  onSubmit: (value: string) => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, onSubmit }) => {
  const [state, setState] = useState('');

  return (
    <div>
      {title}
    </div>
  );
};

export default MyComponent;
```

### CSS Architecture
- All styles organized in `src/styles/`
- Layer-based cascade (tokens → base → utilities → components → pages)
- Use CSS custom properties for consistency
- No inline styles

See [CSS_ARCHITECTURE.md](./CSS_ARCHITECTURE.md) for full guide.

### Code Quality
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
npm run type-check    # TypeScript validation
```

## API Integration

### Environment Configuration
Create `.env` file:
```
VITE_API_BASE_URL=http://localhost:4000/api
```

See `.env.example` for all options.

### API Services (Planned)
Create service layer in `src/services/` for API calls:
```typescript
// src/services/apartmentService.ts
export async function fetchApartments() {
  const response = await fetch('/api/apartments');
  return response.json();
}
```

## Features

### Current
- ✅ Splash screen animation
- ✅ Dashboard with tab navigation
- ✅ Dock navigation component
- ✅ App drawer
- ✅ Make-Ready Board view
- ✅ Start Punch interface
- ✅ Apartment Detail view
- ✅ PWA support

### Planned
- [ ] Real-time updates (WebSocket)
- [ ] Offline functionality
- [ ] Camera integration for photos
- [ ] Data caching
- [ ] Push notifications
- [ ] User authentication
- [ ] Settings/preferences

## PWA Configuration

PWA settings in `vite.config.ts`:
- Standalone display mode
- Dark theme color (`#0b0f18`)
- Auto-update of service worker

Required PWA assets in `public/`:
- `pwa-512x512.png`
- `pwa-384x384.png`
- `pwa-256x256.png`
- `pwa-192x192.png`
- `apple-touch-icon.png`
- `manifest.webmanifest`

## Performance

- Initial load: < 3s
- Smooth animations (60fps)
- Mobile optimized
- Offline support via service worker
- Code splitting by route

## Testing (When Added)

```bash
npm run test
npm run test:watch
npm run test:coverage
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Build Issues
```bash
# Clear cache
rm -rf node_modules/.vite

# Reinstall
npm install

# Type check
npm run type-check
```

### Dev Server Won't Start
- Check port 5173 isn't in use
- Clear `node_modules` and reinstall
- Verify Node 18+ installed

### API Connection Issues
- Verify backend running on localhost:4000
- Check `VITE_API_BASE_URL` in `.env`
- Check browser console for CORS errors

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) at workspace root.

## Resources

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [React Router Docs](https://reactrouter.com/)
- [Lucide React Icons](https://lucide.dev/)
