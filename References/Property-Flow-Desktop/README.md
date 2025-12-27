# Property Flow Desktop - Electron Application

Desktop application for property management using Electron and React.

## Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Building
```bash
npm run build
npm run preview
```

## Project Structure

See README in main project folder for detailed organization.

### Key Directories
- `electron/` - Main and preload scripts
- `src/` - React components and pages
- `src/components/` - Reusable UI components
- `src/pages/` - Full-page views
- `src/styles/` - CSS files

## Features

- Cross-platform desktop app (Windows, macOS, Linux)
- Integration with Property Flow Backend API
- Local data caching
- Offline support

## Development Guidelines

### TypeScript
- Strict mode enabled
- Explicit return types required
- Use interfaces for props

### Code Quality
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

## Environment Configuration

Create `.env` file:
```
VITE_API_BASE_URL=http://localhost:4000/api
```

## Building for Distribution

```bash
npm run build
```

Output will be in `dist/` folder.

## Troubleshooting

### Dev Server Won't Start
- Check port 5174 isn't in use
- Clear `node_modules` and reinstall
- Verify Node 18+ installed

### Build Issues
```bash
# Clear cache
rm -rf node_modules/.vite

# Reinstall and rebuild
npm install
npm run build
```

## Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
