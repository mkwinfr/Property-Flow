# 📚 Quick Reference Guide

## 🎯 Start Here
1. Read **[README.md](./README.md)** - Project overview
2. Check **[ARCHITECTURE.md](./ARCHITECTURE.md)** - How everything fits together
3. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute

## 🏗️ Project Structure

```
Property Flow/
├── Start.bat                          ← Launch dev environment
├── README.md                          ← ⭐ START HERE
├── ARCHITECTURE.md                    ← System design
├── CONTRIBUTING.md                    ← Development guidelines
├── COMPLETION_STATUS.md               ← What was improved
├── IMPLEMENTATION_SUMMARY.md          ← Details of changes
│
├── Property Flow Backend/
│   ├── README.md                      ← Backend overview
│   ├── STRUCTURE.md                   ← Directory layout
│   ├── DEVELOPMENT.md                 ← Dev workflow
│   ├── .env.example                   ← Environment template
│   ├── package.json                   ← Scripts & dependencies
│   ├── tsconfig.json                  ← TypeScript config
│   └── src/
│       ├── index.ts                   ← Express app setup
│       ├── middleware/                ← Error handling, validation
│       ├── routes/                    ← API endpoints
│       ├── controllers/               ← Request handlers (planned)
│       ├── services/                  ← Business logic (planned)
│       ├── types/                     ← Type definitions
│       ├── utils/                     ← Helper functions
│       └── db/                        ← Database layer
│
├── Property Flow Tech/
│   ├── README.md                      ← Frontend overview
│   ├── CSS_ARCHITECTURE.md            ← Style organization
│   ├── PROJECT_STRUCTURE.md           ← File layout
│   ├── .env.example                   ← Environment template
│   ├── package.json                   ← Scripts & dependencies
│   ├── index.html                     ← PWA-ready HTML
│   ├── eslint.config.js               ← Linting rules
│   ├── tsconfig.app.json              ← TypeScript config
│   └── src/
│       ├── main.tsx                   ← App entry point
│       ├── App.tsx                    ← Root component
│       ├── pages/                     ← Full-page components
│       ├── components/                ← Reusable UI components
│       ├── hooks/                     ← Custom React hooks
│       ├── utils/                     ← Helper functions
│       ├── types/                     ← Type definitions
│       ├── services/                  ← API services
│       └── styles/                    ← Global CSS
│
└── Property Flow Desktop/             ← (In development)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (check: `node --version`)
- npm 9+ (check: `npm --version`)
- PostgreSQL 12+ (for backend)

### Setup in 3 Steps

**Step 1: Install Dependencies**
```bash
cd "Property Flow"
cd "Property Flow Backend" && npm install && cd ..
cd "Property Flow Tech" && npm install && cd ..
```

**Step 2: Configure Environment**
```bash
# Backend
cd "Property Flow Backend"
cp .env.example .env
# Edit .env with your PostgreSQL connection

# Frontend
cd ../
cd "Property Flow Tech"
cp .env.example .env
# Edit .env if needed (defaults are fine for local dev)
```

**Step 3: Start Development**
```bash
cd ../  # Back to root
./Start.bat  # Windows - opens both frontend and backend
```

## 📖 Finding What You Need

### I want to...

**Understand the project**
- → Read [README.md](./README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)

**Set up development**
- → Follow "Getting Started" section above
- → Backend: See `Property Flow Backend/DEVELOPMENT.md`
- → Frontend: See `Property Flow Tech/README.md`

**Add a new feature**
- → Follow [CONTRIBUTING.md](./CONTRIBUTING.md)
- → Check code examples in matching directory README

**Fix a bug**
- → Check [ARCHITECTURE.md](./ARCHITECTURE.md) for data flow
- → Look at relevant service/component documentation

**Write a new component**
- → Read `Property Flow Tech/src/components/README.md`
- → Check existing components for patterns

**Add an API endpoint**
- → Read `Property Flow Backend/STRUCTURE.md`
- → See route examples in `src/routes/`

**Understand error handling**
- → See `Property Flow Backend/src/middleware/README.md`

**Work with the database**
- → Run: `npm run prisma:studio` from backend
- → See: `Property Flow Backend/prisma/schema.prisma`

**Optimize performance**
- → Backend: Check service layer docs
- → Frontend: See CSS_ARCHITECTURE.md and optimization sections

## 🔧 Common Commands

### Backend
```bash
cd "Property Flow Backend"

npm run dev                  # Start dev server (port 4000)
npm run build               # Compile TypeScript
npm run type-check          # Check for type errors
npm run prisma:generate     # Sync Prisma client
npm run prisma:migrate      # Create new migration
npm run prisma:seed         # Populate test data
npm run prisma:studio       # Open database browser
```

### Frontend
```bash
cd "Property Flow Tech"

npm run dev                 # Start dev server (port 5173)
npm run build               # Build for production
npm run preview             # Preview production build
npm run lint                # Check code style
npm run lint:fix            # Auto-fix style issues
npm run type-check          # Check for type errors
```

## 🎨 Design System

All colors and typography defined in `src/styles/tokens.css`:

**Colors:**
- Primary: Navy (navy-950 to navy-700)
- Accent: Coral (#e56c74)
- Text: Cream (#f6f7fb)
- Background: Very dark (#121416)

**Typography:**
- Headings: Montserrat 600/700
- Body: Nunito Sans 400/500/600/700

See `Property Flow Tech/CSS_ARCHITECTURE.md` for full design system.

## 📞 Getting Help

**Stuck on setup?**
- Check the relevant README.md (Backend or Frontend)
- See troubleshooting sections

**API errors?**
- Check backend error middleware documentation
- Look at route implementation for error handling

**TypeScript errors?**
- Run `npm run type-check` to see all errors
- Check type definitions in `src/types/`

**Styling issues?**
- Check `CSS_ARCHITECTURE.md`
- Use CSS custom properties from `tokens.css`

**General questions?**
- Check ARCHITECTURE.md for system overview
- See CONTRIBUTING.md for guidelines

## 🎯 Current Feature Status

### ✅ Available Now
- Dashboard with tab navigation
- Apartment inventory view
- Make-Ready Board
- Start Punch clock in/out
- Apartment detail view
- PWA support
- Offline capable

### 🔄 In Progress
- API integration
- Real-time updates

### 📋 Planned
- User authentication
- Camera integration
- Push notifications
- Desktop management app

## 📊 Project Health

- **Documentation**: ⭐⭐⭐⭐⭐ (Comprehensive)
- **Code Organization**: ⭐⭐⭐⭐☆ (Well-structured, some refactoring opportunities)
- **Type Safety**: ⭐⭐⭐⭐⭐ (Strict TypeScript)
- **Testing**: ⭐⭐☆☆☆ (Not yet implemented)
- **Scalability**: ⭐⭐⭐⭐☆ (Good foundations)

---

**Last updated**: December 10, 2025
**Status**: All recommended improvements implemented ✅
