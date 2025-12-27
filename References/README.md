# Property Flow References & Documentation

This folder contains all instructional, architectural, and reference documentation for the Property Flow project. Maintain this as the single source of truth for all .md files and guides.

## 📚 Directory Structure

```
References/
├── README.md (this file)
├── Property-Flow-Tech/          # Field Technician PWA Application
│   ├── README.md                # Quick start and feature overview
│   └── CSS_ARCHITECTURE.md      # CSS organization and guidelines
├── Property-Flow-Backend/       # REST API Server
│   └── README.md                # Quick start and API overview
├── Property-Flow-Desktop/       # Desktop Application (Electron)
│   └── (docs to be added)
└── Webhook-Setup/               # Auto-Pull Configuration
    └── WEBHOOK_SETUP.md         # Complete webhook setup guide
```

## 🚀 Quick Navigation

### Getting Started
- **Property Flow Tech Development**: [Property-Flow-Tech/README.md](Property-Flow-Tech/README.md)
- **Property Flow Backend Setup**: [Property-Flow-Backend/README.md](Property-Flow-Backend/README.md)
- **Webhook Auto-Pull Guide**: [Webhook-Setup/WEBHOOK_SETUP.md](Webhook-Setup/WEBHOOK_SETUP.md)

### Design & Architecture
- **CSS Architecture Guidelines**: [Property-Flow-Tech/CSS_ARCHITECTURE.md](Property-Flow-Tech/CSS_ARCHITECTURE.md)

## 📋 Documentation Standards

### File Naming
- Use `.md` extension for all documentation
- Use UPPER_SNAKE_CASE for guide filenames: `WEBHOOK_SETUP.md`, `ARCHITECTURE.md`
- Use lowercase for general docs: `README.md`

### Organization Rules
**ALL new documentation files must go in this References folder.** This maintains a clean project structure and centralizes all guides.

### File Location Guidelines

| Document Type | Location |
|---|---|
| Quick start guides | `/References/[Project-Name]/README.md` |
| Architecture docs | `/References/[Project-Name]/ARCHITECTURE.md` |
| Setup instructions | `/References/Setup-Name/SETUP.md` |
| API documentation | `/References/[Project-Name]/API_REFERENCE.md` |
| Configuration guides | `/References/[Project-Name]/CONFIGURATION.md` |
| Development guides | `/References/[Project-Name]/DEVELOPMENT.md` |
| Contributing rules | `/References/CONTRIBUTING.md` |

### What NOT to Keep in Source Code Folders
❌ Do NOT create `README.md` in project root folders  
❌ Do NOT scatter `.md` files throughout the codebase  
❌ Do NOT create `docs/` folders in individual projects  
✅ DO place all documentation here in References/

## 🔄 Keeping Documentation Updated

When you make changes to architecture, setup, or workflows:
1. Update the relevant document in `/References/`
2. Keep documentation in sync with actual implementation
3. Date your major updates: `Last updated: 2025-12-26`

## 📝 Creating New Documentation

When you need to document something new:

1. **Determine the category:**
   - Is it about a specific project? → Go in `/References/Project-Name/`
   - Is it about a process/tool? → Create `/References/Process-Name/`
   - Is it workspace-wide? → Create top-level file

2. **Create the file:**
   ```bash
   # Example for new API documentation
   References/Property-Flow-Backend/API_REFERENCE.md
   ```

3. **Link it here:**
   - Update this README with a link
   - Add to the appropriate section
   - Keep the table of contents current

4. **Use the template:**
   ```markdown
   # [Title]
   
   ## Overview
   Brief description of what this covers
   
   ## Quick Start
   Step-by-step setup instructions
   
   ## Detailed Guide
   Full documentation
   
   ## Troubleshooting
   Common issues and solutions
   
   ## Related
   Links to related documentation
   ```

## 📚 Current Documentation

### ✅ Completed
- [x] Webhook Auto-Pull Setup - Complete guide for localhost:192.168.1.245 webhook
- [x] Property Flow Tech README - Development and features overview
- [x] CSS Architecture Guide - Complete styling guidelines
- [x] Property Flow Backend README - API and setup overview

### 📋 Planned
- [ ] Backend Architecture & Database Schema
- [ ] API Reference (detailed endpoints)
- [ ] Desktop Application Guide
- [ ] Deployment & Production Setup
- [ ] Contributing Guidelines
- [ ] Troubleshooting FAQ

## 🔗 External References

### Project Links
- **GitHub Repository**: https://github.com/mkwinfr/Property-Flow.git
- **Backend API**: http://localhost:4000/api
- **Tech App (Dev)**: http://localhost:5173

### Development Resources
- **React Documentation**: https://react.dev
- **Express.js Guide**: https://expressjs.com/
- **Prisma ORM**: https://www.prisma.io/docs/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Vite Documentation**: https://vitejs.dev/

## 💡 Best Practices

### When Writing Documentation
- ✅ Be specific and include examples
- ✅ Include troubleshooting sections
- ✅ Link to related documentation
- ✅ Keep instructions up-to-date with code
- ✅ Use code blocks with language syntax highlighting
- ❌ Don't duplicate information
- ❌ Don't include personal notes or TODOs
- ❌ Don't reference uncommitted changes

### Markdown Tips
- Use headers hierarchically (# > ## > ###)
- Include table of contents for long documents
- Use code blocks for commands and examples
- Use tables for structured information
- Use checkboxes for setup steps
- Link to other docs in References folder

## 📞 Questions?

If documentation is missing or unclear:
1. Check this References folder first
2. Look in related project folders
3. Create an issue or add documentation following guidelines above

---

**Last updated**: 2025-12-26  
**Maintainer**: Development Team
