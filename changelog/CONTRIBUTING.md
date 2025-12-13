# Contributing to Property Flow

Thank you for contributing to Property Flow! This guide explains our development workflow and standards.

## Getting Started

1. **Fork & Clone**
   ```bash
   git clone https://github.com/mkwinfr/Property-Flow.git
   cd "Property Flow"
   ```

2. **Set up development environment**
   ```bash
   # Install dependencies in both directories
   cd "property-flow-backend" && npm install && cd ..
   cd "property-flow-tech" && npm install && cd ..
   ```

3. **Configure environment**
   - Copy `.env.example` to `.env` in each directory
   - Fill in required environment variables
   - Backend needs DATABASE_URL pointing to PostgreSQL

4. **Start development**
   ```bash
   ./Start.bat  # Windows - starts both frontend and backend
   ```

## Branch Naming

Use descriptive branch names with prefixes:

- `feature/description` - New features
- `fix/issue-name` - Bug fixes
- `refactor/task-name` - Code improvements
- `docs/description` - Documentation changes
- `test/description` - Test additions
- `chore/task-name` - Maintenance tasks

Example: `feature/apartment-search`, `fix/api-404-error`

## Commit Messages

Write clear, descriptive commit messages:

```
[type]: Brief description (50 chars max)

More detailed explanation if needed.
- Explain what was changed
- Explain why it was changed
- Reference any related issues (#123)
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring
- `docs` - Documentation
- `test` - Test additions
- `chore` - Maintenance

Example:
```
feat: Add apartment search filter

- Implement search input component
- Add filter logic to apartments list
- Maintain sort order during search
- Closes #45
```

## Code Style

### TypeScript

- **Strict mode**: Always enabled
- **Type safety**: Add explicit types, avoid `any`
- **Naming**: PascalCase for types/classes, camelCase for variables/functions
- **Comments**: JSDoc for public APIs

```typescript
/**
 * Fetches apartment details from the API
 * @param id - The apartment ID
 * @returns Promise containing apartment data
 */
async function fetchApartment(id: number): Promise<Apartment> {
  // Implementation
}
```

### React Components

- **Functional components**: Use hooks, not class components
- **Props**: Define TypeScript interface for all props
- **Naming**: PascalCase for components
- **Organization**: imports → types → component → export

```tsx
import { useState } from 'react';

interface ApartmentCardProps {
  id: number;
  unitNumber: string;
  status: 'vacant' | 'occupied';
  onSelect: (id: number) => void;
}

const ApartmentCard: React.FC<ApartmentCardProps> = ({
  id,
  unitNumber,
  status,
  onSelect,
}) => {
  return (
    <div onClick={() => onSelect(id)}>
      {unitNumber} - {status}
    </div>
  );
};

export default ApartmentCard;
```

### CSS

- **Naming**: BEM convention or utility classes
- **Organization**: Keep styles in appropriate layer
- **Variables**: Use CSS custom properties from tokens.css
- **Selectors**: Keep specificity low

```css
/* Good: Using tokens and utility approach */
.apartment-card {
  padding: var(--spacing-4);
  background: var(--color-navy-800);
  color: var(--color-cream);
  border-radius: 8px;
}

.apartment-card--active {
  background: var(--color-coral);
}
```

## Testing

### Frontend

Test React components:
```bash
cd property-flow-tech
npm run test    # (when available)
```

Components should have:
- Unit tests for hooks
- Integration tests for page flows
- Accessibility considerations

### Backend

Test API endpoints:
```bash
cd property-flow-backend
npm run test    # (when available)
```

Tests should:
- Cover happy path and error cases
- Test validation
- Use test database

## Linting & Type Checking

### Frontend
```bash
cd property-flow-tech

# Check for linting issues
npm run lint

# Fix linting issues automatically
npm run lint -- --fix

# Check for TypeScript errors
npx tsc --noEmit
```

### Backend
```bash
cd property-flow-backend

# Check TypeScript compilation
npm run build

# No linting yet - recommend adding ESLint
```

**Before committing**: Ensure `npm run lint` passes and no TypeScript errors.

## Pull Request Process

1. **Create PR from your feature branch**
   - Write descriptive title and description
   - Reference related issues (#123)
   - Include screenshots/videos if UI changes

2. **PR Description Template**
   ```markdown
   ## Description
   Brief explanation of changes

   ## Related Issues
   Fixes #123

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   Describe how to test these changes

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Linting passes (`npm run lint`)
   - [ ] TypeScript compiles (`npm run build`)
   - [ ] Changes are documented
   - [ ] No new console errors/warnings
   ```

3. **Address feedback**
   - Respond to review comments
   - Make requested changes
   - Re-request review when ready

4. **Merge**
   - Squash commits if multiple
   - Delete branch after merge
   - Verify deployment

## Reporting Issues

### Bug Report

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: Windows/Mac/Linux
- Browser: Chrome/Safari/Firefox
- Node version: 18.x
```

### Feature Request

```markdown
## Description
What feature would be useful

## Use Case
Why this feature is needed

## Proposed Solution
How to implement it (optional)

## Alternatives
Other ways to solve this
```

## Project Structure Maintenance

When adding new files:

### Frontend Components
```
src/components/NewComponent/
├── NewComponent.tsx         # Component file
├── NewComponent.module.css  # (if using CSS modules)
└── index.ts                 # Export for cleaner imports
```

### Backend Routes
```
src/routes/newRoute.ts       # Route definitions
src/services/newService.ts   # Business logic (add when appropriate)
```

### Types
```
src/types/
├── apartment.ts
├── turn.ts
└── api.ts
```

## Documentation

Update documentation when you:
- Add new endpoints (backend README)
- Change component APIs
- Add configuration options
- Create new processes

Keep README.md, ARCHITECTURE.md, and this guide current.

## Performance Considerations

### Frontend
- Avoid inline functions in render
- Use React.memo for expensive components
- Implement code splitting for large routes
- Monitor bundle size

### Backend
- Use efficient Prisma queries
- Avoid N+1 database queries
- Implement pagination for lists
- Cache frequently accessed data

## Security

- Never commit `.env` files
- Don't hardcode sensitive values
- Validate all user inputs
- Sanitize database queries (Prisma handles this)
- Follow OWASP guidelines
- Report security issues privately

## Getting Help

- Ask questions in pull request comments
- Check existing issues for answers
- Review ARCHITECTURE.md for system overview
- Look at existing code for examples

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Project changelog
- Team communications

Thank you for making Property Flow better! 🚀
