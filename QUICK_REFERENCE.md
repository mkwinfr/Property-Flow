# Property Flow Tech - Quick Reference Guide

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 18+
PostgreSQL running locally
Git
```

### Installation
```bash
cd "Property Flow Tech"
npm install
```

### Development
```bash
# Terminal 1: Start Backend API
cd "Property Flow Backend"
npm run dev
# Runs on http://localhost:4000

# Terminal 2: Start Frontend App
cd "Property Flow Tech"
npm run dev
# Runs on http://localhost:5173
```

### Build for Production
```bash
npm run build      # Full TypeScript + Vite build
npm run type-check # TypeScript validation only
npm run lint:fix   # Auto-fix ESLint issues
```

---

## 📚 Project Structure

```
Property Flow Tech/
├── src/
│   ├── components/
│   │   ├── TurnModal/
│   │   │   ├── TurnModal.tsx
│   │   │   ├── tabs/
│   │   │   │   ├── MoveOutInspectionTab.tsx
│   │   │   │   ├── PunchListTab.tsx
│   │   │   │   ├── VendorServicesTab.tsx
│   │   │   │   └── UpdatesLogTab.tsx
│   │   │   └── styles/
│   │   ├── NotificationContainer.tsx
│   │   ├── AppDrawer/
│   │   ├── Dock/
│   │   └── Splash Screen/
│   ├── pages/
│   │   ├── Dashboard/
│   │   ├── MakeReadyBoard/
│   │   ├── Inventory/
│   │   └── ...
│   ├── context/
│   │   └── NotificationContext.tsx
│   ├── types/
│   │   └── turn-management.ts
│   ├── styles/
│   │   ├── tokens.css (Design tokens)
│   │   ├── base.css
│   │   ├── components.css
│   │   └── ...
│   ├── config/
│   │   └── api.ts (API URL helper)
│   └── App.tsx
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🎨 Design System

### Color Tokens (CSS Custom Properties)
```css
/* Primary Colors */
--pf-navy-950: #0a0f24      /* Background */
--pf-cream: #f5f1ed         /* Text */
--pf-coral: #f97c5c         /* Accent primary */
--pf-sky: #3b82f6           /* Accent secondary */
--pf-purple: #a855f7        /* Accent tertiary */

/* Status Colors */
--pf-green: #4ade80         /* Success/Complete */
--pf-red: #ef4444           /* Error/Alert */
--pf-orange: #fb923c        /* Warning */

/* Neutrals */
--pf-stone-300: #d4d4d8
--pf-stone-400: #a1a1aa
--pf-stone-500: #78716c
```

### Using Colors
```tsx
// In CSS
color: var(--pf-cream);
background: var(--pf-navy-950);

// In inline styles
style={{ color: 'var(--pf-coral)' }}
```

---

## 🔌 API Usage Pattern

### Making API Calls
```typescript
import { apiUrl } from '@/config/api';

// GET
const res = await fetch(apiUrl('/api/turns'));
const data = await res.json();

// POST
const res = await fetch(apiUrl('/api/turns'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data }),
});

// PATCH
const res = await fetch(apiUrl(`/api/turns/${id}`), {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ updates }),
});
```

### Error Handling
```typescript
try {
  const res = await fetch(apiUrl('/api/turns'));
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
} catch (err) {
  console.error('API Error:', err);
  // Handle error
}
```

---

## 🔔 Using Notifications

### In Any Component
```typescript
import { useNotifications } from '@/context/NotificationContext';

const MyComponent = () => {
  const { addNotification } = useNotifications();

  const handleSuccess = () => {
    addNotification({
      type: 'success',           // 'success' | 'error' | 'info' | 'warning'
      title: 'Success!',         // Required
      message: 'Action done',    // Optional
      duration: 4000,            // Optional, ms (0 = permanent)
    });
  };

  return <button onClick={handleSuccess}>Save</button>;
};
```

### Notification Types
```typescript
// Success (green)
addNotification({ type: 'success', title: 'Saved', message: 'Changes saved' });

// Error (red)
addNotification({ type: 'error', title: 'Error', message: 'Failed to save' });

// Info (blue)
addNotification({ type: 'info', title: 'Info', message: 'Processing...' });

// Warning (orange)
addNotification({ type: 'warning', title: 'Warning', message: 'Confirm action' });
```

---

## 🎯 Common Tasks

### Adding a New Notification Type
1. Update NotificationContext.tsx `type: 'success' | 'error' | ...`
2. Add CSS class in NotificationContainer.css `.notification-TYPE`
3. Use in components

### Adding a New Tab to TurnModal
1. Create new file: `src/components/TurnModal/tabs/NewTab.tsx`
2. Import in TurnModal.tsx
3. Add to tabs array with id/label/icon
4. Add condition in tab content rendering
5. Add CSS file if needed

### Fetching Turn Data
```typescript
const fetchTurn = async (turnId: number) => {
  try {
    const res = await fetch(apiUrl(`/api/turns/${turnId}`));
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  } catch (err) {
    console.error('Fetch error:', err);
  }
};
```

---

## 🐛 Debugging

### Browser DevTools
- **Console (F12):** Check for error messages
- **Network Tab:** Inspect API calls and responses
- **React DevTools:** Check component state and props
- **Elements:** Inspect CSS and styling

### Common Issues

**"Cannot find module..."**
```bash
npm install  # Reinstall dependencies
```

**API returning 404**
```
- Check backend is running on :4000
- Verify API endpoint in route file
- Check URL matches exactly
```

**CSS not applying**
```
- Check file is imported
- Verify CSS class name matches
- Check for CSS specificity conflicts
```

**TypeScript errors**
```bash
npm run type-check  # Show all errors
# Fix reported issues, errors usually indicate bugs
```

---

## 📋 Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run type-check       # TypeScript validation
npm run lint:fix         # Auto-fix linting issues

# Database (Backend)
npm run prisma:studio    # GUI database browser
npm run prisma:migrate   # Create migration
npm run prisma:generate  # Sync Prisma client
npm run prisma:seed      # Load test data

# Testing
npm run test            # Run tests (if configured)
```

---

## 🚨 Important Patterns

### Always Use Type Safety
```typescript
// ❌ Avoid
const data: any = response;

// ✅ Use
interface TurnData {
  id: number;
  status: string;
}
const data: TurnData = response;
```

### Always Use API Helper
```typescript
// ❌ Avoid
fetch('http://localhost:4000/api/turns')

// ✅ Use
fetch(apiUrl('/api/turns'))
```

### Always Handle Errors
```typescript
// ❌ Avoid
const data = await fetch(...).then(r => r.json());

// ✅ Use
try {
  const res = await fetch(...);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
} catch (err) {
  console.error(err);
}
```

---

## 📖 Documentation Files

- `DEVELOPMENT_COMPLETION.md` - Feature completion summary
- `E2E_TESTING_GUIDE.md` - Testing scenarios and procedures
- `CSS_ARCHITECTURE.md` - Styling system documentation
- `README.md` - Frontend setup and dev guide

---

## 🤝 Code Review Checklist

Before committing:
- [ ] TypeScript compiles: `npm run type-check`
- [ ] No console errors in browser
- [ ] API calls have error handling
- [ ] Components use proper types
- [ ] CSS uses design tokens
- [ ] Notifications added for user feedback
- [ ] Mobile responsive (tested in DevTools)

---

**Last Updated:** December 18, 2025  
**Version:** 1.0  
**Status:** Production Ready (except Desktop integration)
