# NexCRM Quick Reference Card

**Version:** 1.0  
**Last Updated:** 2026-05-28  
**Purpose:** Cheat sheet for common operations, commands, and patterns

---

## 🚀 Essential Commands

### Start Development Environment

```bash
# Start infrastructure (PostgreSQL + Redis)
docker-compose up -d

# Backend server (Terminal 1)
cd backend
npm run dev

# Frontend server (Terminal 2)
cd frontend
npm run dev

# Access application
open http://localhost:3001
```

### Database Operations

```bash
# Seed demo data (6 tenants, 37 users, 300 leads)
cd backend
npm run seed

# Run migrations
npm run db:migrate

# Rollback last migration
npx sequelize-cli db:migrate:undo

# Reset database (dangerous!)
docker-compose down -v
docker-compose up -d
npm run seed
```

### Docker Commands

```bash
# View running containers
docker ps

# View logs
docker logs -f nexcrm_postgres
docker logs -f nexcrm_redis

# Execute PostgreSQL commands
docker exec -it nexcrm_postgres psql -U nexcrm -d nexcrm

# Execute Redis commands
docker exec -it nexcrm_redis redis-cli

# Stop all services
docker-compose down

# Remove volumes (deletes data)
docker-compose down -v
```

---

## 🔑 Default Credentials

### Super Admin
```
Email: superadmin@nexcrm.io
Password: Admin@123
```

### Tenant Admins
```
Education:     admin@edu.nexcrm.io / Admin@123
Real Estate:   admin@realestate.nexcrm.io / Admin@123
Construction:  admin@construction.nexcrm.io / Admin@123
IT Services:   admin@itservices.nexcrm.io / Admin@123
Auto Parts:    admin@autoparts.nexcrm.io / Admin@123
IoT AQI:       admin@iotaqi.nexcrm.io / Admin@123
```

### Sales Reps (any vertical)
```
rep1@{vertical}.nexcrm.io / Rep@123
rep2@{vertical}.nexcrm.io / Rep@123
rep3@{vertical}.nexcrm.io / Rep@123
```

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login              # Login
POST   /api/auth/refresh            # Refresh access token
POST   /api/auth/forgot-password    # Request password reset
POST   /api/auth/reset-password     # Reset password
GET    /api/auth/me                 # Get current user
POST   /api/auth/change-password    # Change password
```

### Leads
```
GET    /api/leads                   # List leads (tenant-scoped)
POST   /api/leads                   # Create lead
GET    /api/leads/:id               # Get lead details
PUT    /api/leads/:id               # Update lead
DELETE /api/leads/:id               # Delete lead (admin only)
GET    /api/leads/stats             # Lead statistics
PATCH  /api/leads/:id/status        # Update lead status
PATCH  /api/leads/:id/assign        # Assign to rep (manager only)
GET    /api/leads/:id/timeline      # Lead activity timeline
POST   /api/leads/import            # Bulk CSV import (admin only)
```

### Templates
```
GET    /api/templates               # List templates
POST   /api/templates               # Create template
GET    /api/templates/:id           # Get template
PUT    /api/templates/:id           # Update template
DELETE /api/templates/:id           # Delete template
```

### Sequences
```
GET    /api/sequences               # List sequences
POST   /api/sequences               # Create sequence
GET    /api/sequences/:id           # Get sequence
PUT    /api/sequences/:id           # Update sequence
DELETE /api/sequences/:id           # Delete sequence
POST   /api/sequences/:id/enroll    # Enroll lead in sequence
```

### Dashboard
```
GET    /api/dashboard/kpis          # Key performance indicators
GET    /api/dashboard/pipeline      # Pipeline visualization
GET    /api/dashboard/rep-performance  # Rep leaderboard
```

### Tracking (Public - No Auth)
```
GET    /track/pixel/:token          # Email open tracking
GET    /track/link/:token           # Link click tracking
```

---

## 🔐 Authentication Headers

### Access Token
```http
Authorization: Bearer <access_token>
```

### Example cURL Request
```bash
curl -X GET http://localhost:5000/api/leads \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## 🗄️ Database Schema Quick Reference

### Core Tables

```
tenants                    # Multi-tenant root
├── id (UUID)
├── name (VARCHAR)
├── subdomain (VARCHAR UNIQUE)
├── vertical_type (VARCHAR)
└── plan_tier (VARCHAR)

users                      # Platform users
├── id (UUID)
├── tenant_id (UUID → tenants)
├── email (VARCHAR)
├── password_hash (VARCHAR)
├── role (ENUM)
├── mfa_enabled (BOOLEAN)
└── last_login (TIMESTAMP)

leads                      # Core business entity
├── id (UUID)
├── tenant_id (UUID → tenants)
├── email (VARCHAR)
├── status (ENUM: NEW, ACTIVE, ENGAGED, ...)
├── lead_type (ENUM: COLD, WARM, HOT)
├── score (INTEGER)
├── assigned_rep_id (UUID → users)
├── gdpr_consent (BOOLEAN)
└── custom_fields (JSONB)

engagement_events          # Behavioral tracking
├── id (UUID)
├── lead_id (UUID → leads)
├── event_type (VARCHAR)
├── score_delta (INTEGER)
└── created_at (TIMESTAMP)

sequences                  # Multi-step campaigns
├── id (UUID)
├── tenant_id (UUID → tenants)
├── name (VARCHAR)
├── steps (JSONB ARRAY)
└── status (ENUM: draft, active, archived)

templates                  # Communication templates
├── id (UUID)
├── tenant_id (UUID → tenants)
├── channel (ENUM: email, sms, whatsapp)
├── subject (VARCHAR)
└── body (TEXT)
```

### Useful SQL Queries

```sql
-- Find tenant by subdomain
SELECT * FROM tenants WHERE subdomain = 'edu';

-- Count leads by status for tenant
SELECT status, COUNT(*) 
FROM leads 
WHERE tenant_id = '<uuid>' 
GROUP BY status;

-- Rep workload
SELECT 
  u.first_name, u.last_name,
  COUNT(l.id) as lead_count,
  AVG(l.score) as avg_score
FROM users u
LEFT JOIN leads l ON l.assigned_rep_id = u.id
WHERE u.tenant_id = '<uuid>' AND u.role = 'sales_rep'
GROUP BY u.id;

-- Recent engagement events
SELECT 
  l.email, e.event_type, e.score_delta, e.created_at
FROM engagement_events e
JOIN leads l ON l.id = e.lead_id
WHERE l.tenant_id = '<uuid>'
ORDER BY e.created_at DESC
LIMIT 20;
```

---

## 🏗️ Code Patterns

### Create New API Endpoint

**1. Define Route (routes.ts)**
```typescript
// backend/src/modules/leads/routes.ts
router.get('/:id/notes', controller.getNotes.bind(controller));
```

**2. Add Controller Method (controllers/)**
```typescript
// backend/src/modules/leads/controllers/leadController.ts
async getNotes(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const service = new LeadService();
  const notes = await service.getLeadNotes(id, req.user.tenant_id);
  res.json(notes);
}
```

**3. Implement Service Logic (services/)**
```typescript
// backend/src/modules/leads/services/leadService.ts
async getLeadNotes(leadId: string, tenantId: string) {
  const lead = await Lead.findOne({
    where: { id: leadId, tenant_id: tenantId }
  });
  if (!lead) throw new Error('Lead not found');
  return lead.notes;
}
```

---

### Frontend API Call

```typescript
// Using React Query
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useLeads = () => {
  return useQuery(['leads'], async () => {
    const response = await api.get('/leads');
    return response.data;
  });
};

// Component usage
const LeadsPage = () => {
  const { data: leads, isLoading, error } = useLeads();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {leads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
    </div>
  );
};
```

---

## 🔍 Debugging Tips

### Enable Sequelize Query Logging
Already enabled in development mode - check terminal for SQL queries.

### Inspect JWT Token
```bash
# Decode token (without verification)
node -e "
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
console.log(JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()));
"
```

### Check Redis Cache
```bash
docker exec -it nexcrm_redis redis-cli
> KEYS *              # List all keys
> GET key_name        # Get value
> TTL key_name        # Check expiry
> FLUSHALL            # Clear all data (dangerous!)
```

### Database Connection Test
```bash
cd backend
node -e "
require('ts-node/register');
const sequelize = require('./src/config/database').default;
sequelize.authenticate()
  .then(() => console.log('✅ Connected'))
  .catch(err => console.error('❌ Error:', err));
"
```

---

## ⚙️ Environment Variables

### Backend (.env)

```bash
# Server
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
JWT_SECRET=<generate-with-openssl-rand>
JWT_REFRESH_SECRET=<different-secret>

# Frontend CORS
FRONTEND_URL=http://localhost:3001

# Email (Mailtrap for dev)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=<mailtrap-username>
SMTP_PASS=<mailtrap-password>
EMAIL_FROM=noreply@nexcrm.local

# File Uploads
UPLOAD_PATH=uploads
MAX_FILE_SIZE=10485760
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:5000
```

---

## 🐛 Common Issues & Fixes

### "Port 5000 already in use"
```bash
# Find process
lsof -i :5000

# Kill process
kill -9 <PID>
```

### "Database connection refused"
```bash
# Check Docker containers
docker ps

# Restart containers
docker-compose down && docker-compose up -d

# Verify DB_PORT matches docker-compose port mapping
# .env: DB_PORT=5433 (NOT 5432)
```

### "CORS error in browser"
```bash
# Check FRONTEND_URL in backend/.env matches frontend port
FRONTEND_URL=http://localhost:3001  # NOT 3000

# Restart backend server after .env changes
```

### "JWT token expired"
```bash
# Re-login to get new token
# Or call /api/auth/refresh with refresh token
```

### "Empty leads table"
```bash
# Run seed script
cd backend && npm run seed
```

---

## 📊 Project Structure Map

```
NEXCRM/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── config/               # DB, env config
│   │   ├── database/
│   │   │   ├── models/           # 18 Sequelize models
│   │   │   └── seed.ts           # Demo data generator
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT, RBAC, tenant isolation
│   │   │   └── errorHandler.ts
│   │   ├── modules/              # 17 feature modules
│   │   │   ├── auth/
│   │   │   ├── leads/
│   │   │   └── ... (15 more)
│   │   ├── cron/                 # Background jobs
│   │   └── utils/
│   ├── uploads/                  # File storage
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Route config
│   │   ├── main.tsx              # Entry point
│   │   ├── features/             # 13 feature modules
│   │   ├── components/           # Shared UI
│   │   ├── store/                # Zustand stores
│   │   ├── services/api.ts       # Axios client
│   │   └── layouts/
│   ├── index.html
│   └── package.json
├── docker-compose.yml            # PostgreSQL + Redis
└── docs/                         # This documentation
```

---

## 📞 Getting Help

1. **Check docs:** Start with [README](./README.md)
2. **Search codebase:** Use VS Code search (Cmd+Shift+F)
3. **Ask team:** #nexcrm-dev Slack channel
4. **Debug logs:** Check terminal output and browser console

---

**Last Updated:** 2026-05-28  
**Maintainer:** [Your Team]  
**License:** Internal Use Only
