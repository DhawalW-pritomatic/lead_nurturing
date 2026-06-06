# NexCRM Developer Onboarding Guide

**Target Audience:** New developers joining the NexCRM project  
**Estimated Onboarding Time:** 2-3 days  
**Last Updated:** 2026-05-28

---

## Welcome to NexCRM! 🎉

This guide will help you set up your development environment, understand the codebase structure, and make your first contributions.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Running the Application](#running-the-application)
4. [Understanding the Codebase](#understanding-the-codebase)
5. [Development Workflow](#development-workflow)
6. [Common Tasks](#common-tasks)
7. [Testing Strategy](#testing-strategy)
8. [Debugging Tips](#debugging-tips)
9. [Code Style & Conventions](#code-style--conventions)
10. [FAQs & Troubleshooting](#faqs--troubleshooting)

---

## Prerequisites

### Required Software

| Tool | Version | Purpose | Installation |
|------|---------|---------|--------------|
| **Node.js** | 20.x+ | Runtime environment | [nodejs.org](https://nodejs.org) |
| **npm** | 10.x+ | Package manager | Comes with Node.js |
| **Docker** | 24.x+ | Container runtime | [docker.com](https://docker.com) |
| **Docker Compose** | 2.x+ | Multi-container orchestration | Included with Docker Desktop |
| **Git** | 2.x+ | Version control | [git-scm.com](https://git-scm.com) |
| **PostgreSQL Client** | 15+ (optional) | Database CLI | `psql` command for debugging |
| **Redis CLI** | 7+ (optional) | Cache inspection | `redis-cli` for debugging |

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - Docker
- **Postman** or **Insomnia** for API testing
- **DBeaver** or **pgAdmin** for database GUI

---

## Initial Setup

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd NEXCRM
```

### Step 2: Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### Step 3: Start Infrastructure Services

```bash
# From repository root
docker-compose up -d

# Verify containers are running
docker ps
# Should see: nexcrm_postgres and nexcrm_redis
```

### Step 4: Configure Environment Variables

**Backend Environment (.env):**

```bash
cd backend
cp .env.example .env  # If .env.example exists

# Edit .env with these critical values:
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=nexcrm
DB_USER=nexcrm
DB_PASSWORD=nexcrm_secret

# Redis
REDIS_URL=redis://localhost:6380

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-too

# Frontend
FRONTEND_URL=http://localhost:3001

# Email (SMTP) - Use Mailtrap for dev
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
EMAIL_FROM=noreply@nexcrm.local

# File uploads
UPLOAD_PATH=uploads
MAX_FILE_SIZE=10485760
```

**Frontend Environment:**

Frontend uses Vite, which loads environment variables from `.env` files:

```bash
cd frontend
# Create .env file
echo "VITE_API_URL=http://localhost:5000" > .env
```

**Evidence:** Configuration pattern from `/backend/src/config/index.ts` (INFERRED)  
**Classification:** STRONG INFERENCE

### Step 5: Seed Database

```bash
cd backend
npm run seed
```

**Expected Output:**
```
✅ Seed completed successfully!

Credentials:
-----------
Super Admin: superadmin@nexcrm.io / Admin@123
Education: admin@edu.nexcrm.io / Admin@123
Real Estate: admin@realestate.nexcrm.io / Admin@123
...
```

**What gets seeded:**
- 6 tenants (Education, Real Estate, Construction, IT Services, Auto Parts, IoT)
- 37 users (admins, managers, reps per tenant)
- 300 leads (50 per tenant)
- 309 engagement events
- Templates, sequences, routing rules, scoring profiles

**Evidence:** `/backend/src/database/seed.ts`

---

## Running the Application

### Development Mode

**Terminal 1: Backend**
```bash
cd backend
npm run dev
# Backend runs on http://localhost:5000
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3001
```

**Terminal 3: Database Logs (Optional)**
```bash
docker logs -f nexcrm_postgres
```

### Access the Application

1. Open browser: `http://localhost:3001`
2. Login with any seeded credentials (see seed output)
3. Explore the dashboard!

---

## Understanding the Codebase

### Backend Structure Deep Dive

```
backend/src/
├── index.ts                 # 🚀 Application entry point
├── config/
│   ├── index.ts             # Environment variable loader
│   └── database.ts          # Sequelize connection setup
├── constants/               # Enums, constants
├── cron/
│   └── index.ts             # Background job scheduler
├── database/
│   ├── models/              # 18 Sequelize models
│   │   ├── index.ts         # Model associations
│   │   ├── Tenant.ts
│   │   ├── User.ts
│   │   ├── Lead.ts
│   │   └── ...
│   ├── migrations/          # Database schema changes
│   ├── seeders/             # Sample data generators
│   └── seed.ts              # Development seed script
├── events/                  # Event emitters (if any)
├── middleware/
│   ├── auth.ts              # 🔐 authenticate, authorize, tenantIsolation
│   └── errorHandler.ts      # Global error handler
├── modules/                 # Feature modules (17 modules)
│   ├── auth/
│   │   ├── routes.ts
│   │   ├── controllers/authController.ts
│   │   ├── services/authService.ts
│   │   ├── dto/             # Request/response schemas
│   │   └── validators/      # express-validator rules
│   ├── leads/
│   ├── sequences/
│   └── ... (14 more)
├── types/                   # TypeScript type definitions
├── utils/                   # Helper functions
└── validators/              # Shared validation logic
```

### Frontend Structure Deep Dive

```
frontend/src/
├── main.tsx                 # React entry point
├── App.tsx                  # Route configuration
├── features/                # Feature-based modules
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── leads/
│   │   ├── LeadsPage.tsx        # List view
│   │   ├── LeadDetailPage.tsx   # Detail view
│   │   └── LeadCreatePage.tsx   # Create form
│   └── ... (11 more)
├── components/              # Shared UI components
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Table.tsx
│   └── ...
├── layouts/
│   └── DashboardLayout.tsx  # Main app shell (sidebar, header)
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts
│   ├── useLeads.ts
│   └── ...
├── store/                   # Zustand global state
│   └── authStore.ts
├── services/
│   └── api.ts               # Axios HTTP client
├── routes/                  # Route definitions (INFERRED)
├── types/                   # TypeScript interfaces
└── utils/                   # Helper functions
```

---

## Development Workflow

### Feature Development Process

#### 1. Create a New Backend Feature Module

**Example: Adding a "Tasks" feature**

```bash
cd backend/src/modules
mkdir tasks
cd tasks
mkdir controllers services dto validators
touch routes.ts
```

**routes.ts:**
```typescript
import { Router } from 'express';
import { TaskController } from './controllers/taskController';
import { authenticate, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new TaskController();

router.use(authenticate, tenantIsolation);

router.get('/', controller.getAll.bind(controller));
router.post('/', controller.create.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;
```

**Register in index.ts:**
```typescript
import taskRoutes from './modules/tasks/routes';
app.use('/api/tasks', taskRoutes);
```

#### 2. Create Corresponding Frontend Feature

```bash
cd frontend/src/features
mkdir tasks
cd tasks
touch TasksPage.tsx TaskDetailPage.tsx TaskCreatePage.tsx
```

**Add route in App.tsx:**
```typescript
<Route path="tasks" element={<TasksPage />} />
<Route path="tasks/:id" element={<TaskDetailPage />} />
```

---

### Database Migrations

#### Creating a Migration

```bash
cd backend
npx sequelize-cli migration:generate --name add-priority-to-leads
```

**Edit migration file:**
```typescript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('leads', 'priority', {
      type: Sequelize.STRING(20),
      defaultValue: 'medium',
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('leads', 'priority');
  },
};
```

**Run migration:**
```bash
npm run db:migrate
```

---

## Common Tasks

### Task 1: Add a New Database Field

**Example: Add `linkedin_profile` to Lead model**

1. **Update Model Definition:**
```typescript
// backend/src/database/models/Lead.ts
interface LeadAttributes {
  // ... existing fields
  linkedin_profile?: string;
}

Lead.init({
  // ... existing fields
  linkedin_profile: { type: DataTypes.STRING(255) },
}, { /* ... */ });
```

2. **Create Migration:**
```bash
npx sequelize-cli migration:generate --name add-linkedin-to-leads
```

3. **Run Migration:**
```bash
npm run db:migrate
```

4. **Update Frontend Type:**
```typescript
// frontend/src/types/lead.ts
export interface Lead {
  // ... existing fields
  linkedin_profile?: string;
}
```

---

### Task 2: Add a New API Endpoint

**Example: `GET /api/leads/:id/activity-summary`**

**Controller Method:**
```typescript
// backend/src/modules/leads/controllers/leadController.ts
async getActivitySummary(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const service = new LeadService();
  const summary = await service.getActivitySummary(id, req.user.tenant_id);
  res.json(summary);
}
```

**Route Registration:**
```typescript
// backend/src/modules/leads/routes.ts
router.get('/:id/activity-summary', controller.getActivitySummary.bind(controller));
```

**Frontend Hook:**
```typescript
// frontend/src/hooks/useLeadActivity.ts
export const useLeadActivity = (leadId: string) => {
  return useQuery(['lead-activity', leadId], async () => {
    const response = await api.get(`/leads/${leadId}/activity-summary`);
    return response.data;
  });
};
```

---

### Task 3: Debug a Query

**Using psql:**
```bash
docker exec -it nexcrm_postgres psql -U nexcrm -d nexcrm

-- Check tenant data
SELECT * FROM tenants;

-- Check leads for a tenant
SELECT id, email, status, score FROM leads WHERE tenant_id = '<tenant-uuid>' LIMIT 10;

-- Check engagement events
SELECT lead_id, event_type, score_delta FROM engagement_events ORDER BY created_at DESC LIMIT 20;
```

**Using Redis CLI:**
```bash
docker exec -it nexcrm_redis redis-cli -p 6379

-- Check all keys
KEYS *

-- Get a specific key
GET some-key

-- Check TTL
TTL some-key
```

---

## Testing Strategy

### Current State (INFERRED - No Test Files Detected)

**Missing:**
- ❌ Unit tests
- ❌ Integration tests
- ❌ E2E tests

**Recommended Setup:**

**Backend Testing:**
```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

**Example Unit Test:**
```typescript
// backend/src/modules/auth/services/authService.test.ts
import { AuthService } from './authService';

describe('AuthService', () => {
  it('should hash password correctly', async () => {
    const service = new AuthService();
    const hashed = await service.hashPassword('test123');
    expect(hashed).not.toBe('test123');
  });
});
```

**Frontend Testing:**
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

---

## Debugging Tips

### Backend Debugging

**1. Enable Sequelize Query Logging:**

Already enabled in development mode:
```typescript
// backend/src/config/database.ts
logging: config.nodeEnv === 'development' ? console.log : false,
```

**2. Add Debug Breakpoints (VS Code):**

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

**3. Inspect Request Objects:**
```typescript
console.log('Request User:', req.user);
console.log('Request Body:', req.body);
console.log('Request Params:', req.params);
```

---

### Frontend Debugging

**1. React DevTools:**
- Install browser extension
- Inspect component props, state, and hooks

**2. Network Tab:**
- Monitor API calls
- Check request/response payloads
- Verify auth headers

**3. Zustand DevTools:**
```typescript
// store/authStore.ts
import { devtools } from 'zustand/middleware';

export const useAuthStore = create(
  devtools((set) => ({ /* ... */ }))
);
```

---

## Code Style & Conventions

### TypeScript Conventions

**Naming:**
- **Classes:** PascalCase (`AuthService`, `LeadController`)
- **Functions/Variables:** camelCase (`getUserById`, `isAuthenticated`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `JWT_SECRET`)
- **Interfaces:** PascalCase with `I` prefix optional (`LeadAttributes`, `IAuthRequest`)

**File Naming:**
- **Models:** PascalCase (`Lead.ts`, `User.ts`)
- **Services:** camelCase + suffix (`authService.ts`, `leadService.ts`)
- **Controllers:** camelCase + suffix (`authController.ts`)
- **Components:** PascalCase (`LoginPage.tsx`, `LeadCard.tsx`)

---

### Database Conventions

**Table Names:** Plural, snake_case (`leads`, `sequence_enrollments`)

**Column Names:** snake_case (`created_at`, `assigned_rep_id`)

**Foreign Keys:** `<entity>_id` (`tenant_id`, `lead_id`)

**Indexes:** Multi-column indexes prefixed with primary filter (`tenant_id` always first)

---

## FAQs & Troubleshooting

### Q1: "Port 5000 already in use"

**Solution:**
```bash
# Find process
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use alternative port in .env
PORT=5001
```

### Q2: "Database connection refused"

**Solution:**
```bash
# Check Docker containers
docker ps

# Restart containers
docker-compose down
docker-compose up -d

# Verify DB_PORT in .env matches docker-compose
DB_PORT=5433  # NOT 5432
```

### Q3: "Frontend shows blank page"

**Solution:**
```bash
# Check console for errors
# Verify API_URL in frontend .env
VITE_API_URL=http://localhost:5000

# Restart Vite dev server
npm run dev
```

### Q4: "CORS errors in browser"

**Solution:**
```bash
# Check backend FRONTEND_URL matches actual frontend port
# backend/.env
FRONTEND_URL=http://localhost:3001  # NOT 3000
```

### Q5: "JWT token expired"

**Solution:**
```bash
# Use refresh token endpoint
POST /api/auth/refresh
{ "refreshToken": "<token>" }

# Or re-login
```

---

## Next Steps After Onboarding

1. **Day 1-2:** Set up environment, run application, explore UI
2. **Day 3:** Read business domain docs, understand workflows
3. **Day 4:** Review architecture docs, trace a request end-to-end
4. **Day 5:** Pick a "good first issue" ticket and implement
5. **Week 2:** Add tests, review PRs, pair program with team

---

## Useful Commands Cheat Sheet

```bash
# Start everything
docker-compose up -d && cd backend && npm run dev &
cd frontend && npm run dev

# Stop everything
docker-compose down
killall node

# Reset database
docker-compose down -v
docker-compose up -d
cd backend && npm run seed

# Check logs
docker logs nexcrm_postgres
docker logs nexcrm_redis
tail -f backend/logs/app.log  # If logging to file

# Database backup
docker exec nexcrm_postgres pg_dump -U nexcrm nexcrm > backup.sql

# Database restore
docker exec -i nexcrm_postgres psql -U nexcrm nexcrm < backup.sql
```

---

**Welcome to the team! Happy coding! 🚀**

If you have questions, reach out to:
- **Tech Lead:** [Name/Email]
- **Backend Team:** [Slack Channel]
- **Frontend Team:** [Slack Channel]

**Documentation:**
- Architecture: `docs/03-ARCHITECTURE-ANALYSIS.md`
- Business Domain: `docs/02-BUSINESS-DOMAIN-ANALYSIS.md`
- API Reference: (TODO: Add Swagger/OpenAPI docs)
