# NexCRM Repository Overview

**Classification: VERIFIED**  
**Confidence: 95%**  
**Last Updated: 2026-05-28**

---

## Executive Summary

NexCRM is a **multi-tenant SaaS CRM platform** designed for vertical-specific lead management, outreach automation, and sales workflow orchestration. The system supports multiple business verticals (Education, Real Estate, Construction, IT Services, Auto Parts, IoT) with tenant-isolated data and customizable workflows.

**Evidence:**
- Repository name: `NEXCRM`
- Backend description: `/home/dhawal/NextgEN/NEXCRM/backend/package.json:3` - "NexCRM Multi-Tenant CRM Backend"
- Seed data: `/home/dhawal/NextgEN/NEXCRM/backend/src/database/seed.ts` - Creates 6 tenants across different verticals

---

## Repository Structure

### High-Level Architecture

```
NEXCRM/
├── backend/          # Node.js/TypeScript/Express API
├── frontend/         # React/TypeScript SPA
├── docker-compose.yml
├── nexcrm_dump.sql   # Database backup
└── uploads/          # File storage directory
```

**Classification: VERIFIED**  
**Evidence:** Direct filesystem inspection at `/home/dhawal/NextgEN/NEXCRM/`

---

## Technology Stack

### Backend Technologies

| Technology | Version | Purpose | Evidence |
|-----------|---------|---------|----------|
| **Node.js** | 20.x+ | Runtime | `package.json` devDependencies `@types/node: ^20.10.0` |
| **TypeScript** | 5.3.2 | Type safety | `backend/package.json:51` |
| **Express** | 4.18.2 | Web framework | `backend/package.json:13` |
| **Sequelize** | 6.35.0 | ORM | `backend/package.json:18` |
| **PostgreSQL** | 15-alpine | Primary database | `docker-compose.yml:5` |
| **Redis** | 7-alpine | Caching/sessions | `docker-compose.yml:18` |
| **JWT** | 9.0.2 | Authentication | `backend/package.json:21` |

**Classification: VERIFIED**  
**Confidence: 100%**

### Frontend Technologies

| Technology | Version | Purpose | Evidence |
|-----------|---------|---------|----------|
| **React** | 18.2.0 | UI framework | `frontend/package.json:9` |
| **TypeScript** | 5.3.2 | Type safety | `frontend/package.json:30` |
| **Vite** | 5.0.8 | Build tool | `frontend/package.json:32` |
| **React Router** | 6.20.1 | Routing | `frontend/package.json:11` |
| **Zustand** | 4.4.7 | State management | `frontend/package.json:12` |
| **TanStack Query** | 5.12.2 | Data fetching | `frontend/package.json:11` |
| **Tailwind CSS** | 3.3.6 | Styling | `frontend/package.json:29` |
| **Recharts** | 2.10.3 | Data visualization | `frontend/package.json:16` |

**Classification: VERIFIED**  
**Confidence: 100%**

---

## Infrastructure Components

### Containerized Services

**PostgreSQL Database:**
```yaml
Image: postgres:15-alpine
Port Mapping: 5433:5432 (custom port to avoid conflicts)
Volume: pgdata (persistent)
Health Check: pg_isready command every 5s
```

**Redis Cache:**
```yaml
Image: redis:7-alpine
Port Mapping: 6380:6379 (custom port)
Volume: redisdata (persistent)
```

**Evidence:** `/home/dhawal/NextgEN/NEXCRM/docker-compose.yml`  
**Classification: VERIFIED**

---

## Module Structure

### Backend Modules

The backend follows a **modular monolith** architecture:

1. **`auth`** - Authentication & authorization
2. **`leads`** - Lead management
3. **`outreach`** - Communication campaigns
4. **`tracking`** - Email/link tracking
5. **`scoring`** - Lead scoring engine
6. **`templates`** - Email/SMS templates
7. **`sequences`** - Multi-step campaigns
8. **`routing`** - Lead routing rules
9. **`assets`** - Digital asset management
10. **`users`** - User management
11. **`dashboard`** - Analytics & KPIs
12. **`tenants`** - Multi-tenancy management
13. **`notifications`** - In-app notifications
14. **`scheduler`** - Email scheduling
15. **`bulk-import`** - CSV lead imports
16. **`nurturing`** - Lead nurturing settings
17. **`admin`** - Admin operations

**Evidence:** `/home/dhawal/NextgEN/NEXCRM/backend/src/modules/` directory listing  
**Classification: VERIFIED**

### Frontend Features

```
src/features/
├── auth/           # Login, authentication
├── dashboard/      # Main dashboard
├── leads/          # Lead management UI
├── templates/      # Template management
├── sequences/      # Sequence builder
├── routing/        # Routing configuration
├── assets/         # Asset library
├── outreach/       # Outreach monitoring
├── scheduler/      # Email scheduling
├── bulk-import/    # CSV import UI
├── notifications/  # Notification center
├── users/          # User management
└── settings/       # System settings
```

**Evidence:** `/home/dhawal/NextgEN/NEXCRM/frontend/src/features/` directory listing  
**Classification: VERIFIED**

---

## Database Models

### Core Entities

1. **Tenant** - Multi-tenant isolation root
2. **User** - Platform users (admins, managers, sales reps)
3. **Lead** - Contact/prospect records
4. **ApplicationType** - Vertical-specific application types
5. **OutreachRecord** - Communication history
6. **EngagementEvent** - Lead interaction tracking
7. **Template** - Reusable communication templates
8. **Sequence** - Multi-step campaign definitions
9. **SequenceEnrollment** - Lead enrollment in sequences
10. **RoutingRule** - Automated lead assignment
11. **ScoringProfile** - Lead scoring configuration
12. **Asset** - Digital files/documents
13. **AssetProject** - Asset organization
14. **AssetFolder** - Asset hierarchical storage
15. **AuditLog** - Compliance/audit trail
16. **Notification** - In-app notifications
17. **EmailSchedule** - Scheduled email campaigns
18. **NurturingSettings** - Tenant-level nurturing config

**Evidence:** `/home/dhawal/NextgEN/NEXCRM/backend/src/database/models/` directory  
**Classification: VERIFIED**  
**Confidence: 100%**

---

## Development Workflow

### NPM Scripts

**Backend:**
```bash
npm run dev     # Development server with hot reload (ts-node-dev)
npm run build   # TypeScript compilation to dist/
npm start       # Production server (compiled JS)
npm run seed    # Populate demo data
```

**Frontend:**
```bash
npm run dev     # Vite dev server with HMR
npm run build   # Production build (TypeScript + Vite)
npm run preview # Preview production build
```

**Evidence:** Backend `/home/dhawal/NextgEN/NEXCRM/backend/package.json:5-12`  
Frontend `/home/dhawal/NextgEN/NEXCRM/frontend/package.json:6-8`  
**Classification: VERIFIED**

---

## Port Allocation

| Service | Port | Purpose |
|---------|------|---------|
| Frontend (Vite) | 3001 | Development UI |
| Backend (Express) | 5000 | REST API |
| PostgreSQL | 5433 | Database (custom) |
| Redis | 6380 | Cache (custom) |

**Note:** Ports 3001 and custom DB ports used to avoid conflicts with other services  
**Evidence:** Terminal output from seeding process, docker-compose.yml, .env file  
**Classification: VERIFIED**

---

## Build System

### Backend Compilation
- **TypeScript** → JavaScript (ES target unknown - need tsconfig inspection)
- Output: `dist/` directory
- Entry: `dist/index.js`

### Frontend Build
- **Vite** bundler
- **TypeScript** + **React** + **Tailwind CSS**
- Output: `dist/` directory (INFERRED)
- **Tree-shaking** and **code-splitting** enabled (STRONG INFERENCE)

**Classification: STRONG INFERENCE**  
**Missing:** Actual Vite configuration inspection needed for build optimizations

---

## Unknowns & Limitations

### Missing Information:
1. Production deployment configuration (Kubernetes, Docker Swarm, or manual deployment?)
2. CI/CD pipeline definition (GitHub Actions, GitLab CI, Jenkins?)
3. Monitoring/observability stack (Prometheus, Grafana, Datadog?)
4. Backup/disaster recovery procedures
5. Load balancing configuration
6. CDN configuration for frontend assets
7. Environment variable documentation for production
8. Secrets management system (AWS Secrets Manager, Vault?)
9. SSL/TLS certificate management
10. Rate limiting thresholds for production

### Assumptions Requiring Validation:
1. Single-region deployment (no multi-region evidence found)
2. Manual scaling (no autoscaling configuration detected)
3. No message queue beyond Redis (Kafka/RabbitMQ not found)
4. No real-time WebSocket layer detected
5. No dedicated search engine (Elasticsearch/Algolia)

---

## Repository Quality Indicators

### Strengths:
✅ TypeScript throughout (type safety)  
✅ Modular architecture (separation of concerns)  
✅ Database migrations via Sequelize  
✅ Docker-based development environment  
✅ Comprehensive seeding system  
✅ Multi-tenancy from the ground up  

### Concerns:
⚠️ No test files detected (testing framework unknown)  
⚠️ No CI/CD pipeline visible  
⚠️ No API documentation (Swagger/OpenAPI) detected  
⚠️ No explicit monitoring/logging configuration  

**Classification: VERIFIED**  
**Confidence: 85%** (requires deeper inspection for testing strategy)

---

## Next Steps for Analysis

1. Inspect `tsconfig.json` for TypeScript configuration details
2. Review middleware stack for security hardening
3. Analyze database indexes and query optimization
4. Security audit of authentication/authorization
5. Review error handling patterns
6. Analyze frontend state management architecture
7. Inspect cron jobs and background processing
8. Review API response structures

---

**Document Status:** Initial Repository Reconnaissance Complete  
**Requires Human Validation:** Production deployment architecture, testing strategy
