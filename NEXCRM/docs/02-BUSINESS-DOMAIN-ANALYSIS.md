# NexCRM Business Domain Analysis

**Classification: STRONG INFERENCE (Code-based Reconstruction)**  
**Confidence: 82%**  
**Last Updated: 2026-05-28**

---

## Executive Summary

NexCRM is a **vertical-specific, multi-tenant CRM platform** designed for mid-market sales organizations operating in regulated or specialized industries. The platform addresses the challenge of managing **high-volume lead pipelines** with **automated nurturing sequences** while maintaining **compliance** and **vertical-specific customization**.

**Key Value Proposition:**  
Combines lead tracking, multi-channel outreach automation, intelligent routing, and scoring in a white-labeled, multi-tenant architecture.

---

## Industry Context

### What Business Problem Does NexCRM Solve?

**Primary Pain Points Addressed:**

1. **Manual Lead Follow-up** → Automated sequences with intelligent timing
2. **Generic CRM Limitations** → Vertical-specific workflows and terminology
3. **Lead Distribution Inefficiency** → Rule-based routing and workload balancing
4. **Engagement Blind Spots** → Behavioral tracking and scoring
5. **Multi-Channel Chaos** → Unified outreach orchestration (email, SMS, WhatsApp)
6. **Compliance Risks** → GDPR consent tracking, opt-out management, audit logs

**Evidence:**
- Sequence automation: `/backend/src/database/models/Sequence.ts`
- GDPR fields: `/backend/src/database/models/Lead.ts:27-28` - `gdpr_consent`, `opted_out`
- Audit logging: `/backend/src/database/models/AuditLog.ts`
- Multi-channel templates: `/backend/src/database/models/Template.ts` (email, WhatsApp, SMS)

**Classification: STRONG INFERENCE**  
**Confidence: 85%**

---

## Target Markets (Verticals)

NexCRM supports **6 vertical markets** out-of-the-box:

### 1. **Education (EdTech)**
**Business Type:** Universities, Online Course Providers, Coaching Centers  
**Lead Types:** Prospective students, parent inquiries  
**Application Types:**
- Undergraduate Admission
- Postgraduate Admission  
- Certificate Programs
- Online Courses
- Test Prep/Coaching

**Evidence:** Seed data `/backend/src/database/seed.ts:88-89`

---

### 2. **Real Estate**
**Business Type:** Property Developers, Real Estate Agencies  
**Lead Types:** Property buyers, investors, renters  
**Application Types:**
- Residential Plots
- 2BHK/3BHK Apartments
- Villas
- Commercial Spaces

**Evidence:** Seed data `/backend/src/database/seed.ts:90`

---

### 3. **Construction**
**Business Type:** Contractors, Architecture Firms, Interior Designers  
**Lead Types:** Project inquiries, consultation requests  
**Application Types:**
- Residential Construction
- Commercial Build
- Renovation/Fitout
- Interior Design
- Project Consultation

**Evidence:** Seed data `/backend/src/database/seed.ts:91`

---

### 4. **IT Services/Software**
**Business Type:** Software Development Agencies, IT Consultancies  
**Lead Types:** Project inquiries, B2B clients  
**Application Types:**
- Custom Software Development
- Mobile App Development
- Website/Portal Development
- IT Consulting
- Cloud Migration

**Evidence:** Seed data `/backend/src/database/seed.ts:92`

---

### 5. **Auto Parts/Automotive**
**Business Type:** Auto Parts Retailers, OEMs, Workshop Suppliers  
**Lead Types:** Retail customers, B2B partners, workshop owners  
**Application Types:**
- Retail Walk-in
- Online Orders
- Bulk B2B Orders
- OEM Partnerships
- Workshop Supply

**Evidence:** Seed data `/backend/src/database/seed.ts:93`

---

### 6. **IoT/AQI (Air Quality Monitoring)**
**Business Type:** IoT Device Manufacturers, Environmental Monitoring  
**Lead Types:** Institutions, industrial clients, residential customers  
**Application Types:**
- Individual Residential Units
- Institutional (Schools, Offices)
- Industrial Monitoring
- B2B Bulk Orders
- API Data Services

**Evidence:** Seed data `/backend/src/database/seed.ts:94`

**Classification: VERIFIED**  
**Confidence: 100%**

---

## User Personas

### 1. **Super Admin**
**Role:** Platform-level administrator  
**Access:** Cross-tenant visibility and control  
**Responsibilities:**
- Tenant provisioning
- Global platform monitoring
- Multi-tenant analytics (INFERRED)

**Evidence:** User model `/backend/src/database/models/User.ts` - Role enum includes `super_admin`  
Seed data creates: `superadmin@nexcrm.io`

---

### 2. **Tenant Admin**
**Role:** Organization owner/administrator  
**Access:** Full control within their tenant  
**Responsibilities:**
- User management
- System configuration
- Billing/subscription management (INFERRED)
- Workflow customization
- Vertical-specific settings

**Evidence:** Seed data creates admin@{vertical}.nexcrm.io accounts  
Authorization middleware: `/backend/src/middleware/auth.ts:42` - `authorize(...roles)`

---

### 3. **Sales Manager**
**Role:** Sales team supervisor  
**Access:** Team oversight and workflow management  
**Responsibilities:**
- Lead assignment and distribution
- Team performance monitoring
- Campaign approval/oversight
- Routing rule configuration
- Report generation

**Evidence:** 
- Authorization on lead assignment: `/backend/src/modules/leads/routes.ts:29`
- Seed creates `manager@{vertical}.nexcrm.io` accounts

---

### 4. **Senior Sales Rep**
**Role:** Experienced sales representative  
**Access:** Enhanced permissions for complex deals  
**Responsibilities:**
- Handle high-value leads ("enterprise", "luxury" tags)
- Mentor junior reps
- Custom outreach sequences
- Direct client negotiation

**Evidence:** 
- User seed includes `rep_tags: ['enterprise', 'luxury']`
- Role hierarchy in authorization checks

---

### 5. **Sales Rep**
**Role:** Individual contributor (frontline)  
**Access:** Assigned leads and basic outreach tools  
**Responsibilities:**
- Follow up on assigned leads
- Execute outreach sequences
- Update lead status and notes
- Log engagement activities

**Evidence:**
- Territory assignment in seed: `territory: 'Mumbai', 'Delhi', 'Bangalore'`
- Rep tags: `['retail'], ['online'], ['b2b']`

---

### 6. **Read-Only Analyst**
**Role:** Business intelligence/reporting  
**Access:** View-only access to analytics  
**Responsibilities:**
- Generate reports
- Monitor KPIs
- Data analysis

**Evidence:** User role enum includes `read_only_analyst`

**Classification: VERIFIED**  
**Confidence: 90%**

---

## Core Business Workflows

### Workflow 1: Lead Acquisition & Enrollment

```
1. Lead Entry → 
2. Source Attribution → 
3. Application Type Classification →
4. Auto-Scoring →
5. Routing Evaluation →
6. Rep Assignment →
7. Sequence Enrollment
```

**Evidence:**
- Lead model sources: `/backend/src/database/models/Lead.ts:14` - `source` field
- Scoring: `score` field with default 0
- Assignment: `assigned_rep_id` field
- Enrollment: `SequenceEnrollment` model

**Classification: STRONG INFERENCE**  
**Confidence: 85%**

---

### Workflow 2: Multi-Channel Outreach Campaign

```
1. Template Creation (Email/SMS/WhatsApp) →
2. Sequence Design (Multi-Step) →
3. Lead Segmentation & Enrollment →
4. Automated Message Dispatch →
5. Engagement Tracking (Opens/Clicks) →
6. Dynamic Scoring Updates →
7. Sequence Progression or Exit
```

**Evidence:**
- Template channels: `/backend/src/database/models/Template.ts` - ENUM('email', 'whatsapp', 'sms')
- Sequence steps: `steps` JSONB field
- Engagement tracking: `/backend/src/database/models/EngagementEvent.ts`
- Tracking pixel routes: `/backend/src/index.ts:81` - `/track` prefix

**Classification: VERIFIED**  
**Confidence: 92%**

---

### Workflow 3: Lead Scoring & Qualification

**Scoring Triggers:**
- Email opened: +5 to +20 points (INFERRED from seed data patterns)
- Link clicked: +10 to +20 points
- Asset downloaded: +15 to +20 points
- High-intent page visit: +15 to +20 points
- Form submission: Variable (INFERRED)

**Score-Based Type Transitions:**
- Score ≥ 80 → HOT lead
- Score 40-79 → WARM lead
- Score < 40 → COLD lead

**Evidence:**
- Engagement score deltas: `/backend/src/database/seed.ts` - `score_delta` values
- Lead type enum: `COLD, WARM, HOT, STALE, CONVERTED, LOST`

**Classification: STRONG INFERENCE**  
**Confidence: 78%** (exact thresholds require configuration inspection)

---

### Workflow 4: Lead Routing & Distribution

**Routing Criteria (INFERRED):**
- Geography (city-based territories)
- Lead source
- Application type
- Rep availability/capacity
- Rep specialization (tags: retail, b2b, online, enterprise)
- Round-robin or priority-based

**Evidence:**
- Routing rules model: `/backend/src/database/models/RoutingRule.ts`
- `condition_expression` JSONB (dynamic rules)
- `action_config` JSONB (assignment actions)
- Priority field for rule ordering

**Classification: STRONG INFERENCE**  
**Confidence: 70%** (requires rule engine code inspection)

---

### Workflow 5: Asset Distribution

**Use Case:** Sending brochures, product catalogs, pricing sheets  
**Workflow:**
1. Asset upload to project/folder hierarchy
2. Asset tagged to specific verticals/application types
3. Rep shares asset with lead
4. Download tracked as engagement event (+15-20 score)

**Evidence:**
- Asset models: `Asset`, `AssetProject`, `AssetFolder`
- Tracking in engagement events: `asset_downloaded` event type

**Classification: VERIFIED**  
**Confidence: 85%**

---

### Workflow 6: Compliance & Audit

**GDPR/Regulatory Requirements:**
- Consent tracking (gdpr_consent boolean)
- Opt-out management (opted_out boolean)
- Email status validation (valid/bounced/invalid)
- Audit log of all entity changes
- Data retention policies (UNVERIFIED)

**Evidence:**
- Lead GDPR fields: `/backend/src/database/models/Lead.ts:27-29`
- Audit log: `/backend/src/database/models/AuditLog.ts`
- Actor tracking, entity versioning (old_value/new_value JSONB)

**Classification: VERIFIED**  
**Confidence: 90%**

---

## Revenue Model (INFERRED)

### Multi-Tenant SaaS Pricing

**Plan Tiers Detected:**
- `standard` (default)
- `enterprise`

**Evidence:** Tenant model `plan_tier` field

**Likely Pricing Factors:**
1. Number of users per tenant
2. Lead volume limits
3. Sequence complexity
4. Storage quotas for assets
5. API rate limits
6. White-labeling options (branding JSONB)

**Monetization Features (INFERRED):**
- Pay-per-user licensing
- Tiered feature gates (enterprise gets advanced routing)
- Usage-based pricing (email/SMS sends)
- Professional services (vertical customization)

**Classification: WEAK INFERENCE**  
**Confidence: 45%** (requires business documentation or pricing page analysis)

---

## Operational Metrics (KPIs)

### Lead Management KPIs (INFERRED)

1. **Conversion Rate:** `CONVERTED` leads / Total leads
2. **Response Time:** Time from lead creation to first outreach
3. **Lead Velocity:** Average days from NEW → CONVERTED
4. **Pipeline Health:** Distribution across COLD/WARM/HOT
5. **Rep Productivity:** Leads handled per rep per week

### Outreach KPIs

1. **Open Rate:** `email_opened` events / emails sent
2. **Click-Through Rate:** `email_cta_clicked` / emails delivered
3. **Bounce Rate:** Bounced emails / total sends
4. **Sequence Completion Rate:** Completed enrollments / total enrollments
5. **Engagement Score Trends:** Average score increase over time

### System Health KPIs

1. **Tenant Active Users:** Active users per tenant
2. **Lead Volume Growth:** Month-over-month lead growth
3. **Asset Utilization:** Downloads per asset
4. **Sequence Effectiveness:** Conversion rate per sequence

**Evidence:**
- Dashboard module exists: `/backend/src/modules/dashboard/`
- Stats endpoint on leads: `/backend/src/modules/leads/routes.ts:22`

**Classification: STRONG INFERENCE**  
**Confidence: 75%** (requires dashboard service inspection)

---

## Business Rules & Constraints

### Multi-Tenancy Isolation

**Rule:** All data operations MUST be tenant-scoped  
**Enforcement:** `tenantIsolation` middleware on all protected routes  
**Evidence:** `/backend/src/middleware/auth.ts:46-52`

**Classification: VERIFIED**  
**Confidence: 100%**

### Lead Lifecycle States

**Valid Transitions (INFERRED):**
```
NEW → ACTIVE → ENGAGED → MEETING_SCHEDULED → PROPOSAL_SENT → 
  NEGOTIATION → CONVERTED | LOST
      ↓
   STALE (inactive for X days)
      ↓
   OPTED_OUT (user request)
```

**Evidence:** Status enum in Lead model

**Classification: STRONG INFERENCE**  
**Confidence: 65%** (requires state machine code inspection)

### Nurturing Constraints

**Rules (VERIFIED from NurturingSettings model):**
- Cold outreach interval: 5 days (default)
- Warm sequence interval: 2 days (default)
- Stale re-engagement: 14 days (default)
- Max cold attempts: 6 (default)
- Daily send window: 09:00 - 18:00
- Allowed days: Monday-Saturday (default)
- Max messages per week: 3 (default)
- Global pause capability (emergency stop)

**Evidence:** `/backend/src/database/models/NurturingSettings.ts`

**Classification: VERIFIED**  
**Confidence: 95%**

---

## Industry-Specific Terminology

### Education Vertical
- "Application" instead of "Lead"
- "Admission" instead of "Deal"
- "Program" instead of "Product"

### Real Estate
- "Property Inquiry" instead of "Lead"
- "Site Visit" instead of "Meeting"
- "Booking" instead of "Conversion"

### Construction
- "Project Inquiry" instead of "Lead"
- "Quotation" instead of "Proposal"
- "Contract" instead of "Deal"

**Evidence:** ApplicationType model allows vertical-specific naming  
**Classification: STRONG INFERENCE**  
**Confidence: 70%**

---

## Competitive Positioning

### Differentiation (INFERRED)

**vs. Generic CRMs (Salesforce, HubSpot):**
- ✅ Vertical-specific out-of-the-box
- ✅ Multi-tenant white-labeling
- ✅ Integrated outreach automation
- ✅ No external integrations needed

**vs. Marketing Automation (Marketo, Pardot):**
- ✅ CRM + Automation in one platform
- ✅ Simpler pricing (no MA premium)
- ✅ Sales-focused (not marketing)

**vs. Vertical SaaS:**
- ✅ Multi-vertical flexibility
- ✅ Faster deployment (pre-built)

**Classification: WEAK INFERENCE**  
**Confidence: 40%** (requires market research validation)

---

## Unknowns & Business Questions

### Critical Unknowns:
1. **Pricing Model:** Per-user? Per-lead? Tiered?
2. **Contract Terms:** Monthly? Annual? Multi-year?
3. **Target Company Size:** SMB? Mid-market? Enterprise?
4. **Geographic Markets:** India-focused? Global?
5. **Sales Model:** Self-serve? Sales-assisted? Partner-led?
6. **Support Model:** Email? Chat? Phone? Dedicated CSM?
7. **Onboarding Process:** Self-service? Guided? Professional services?
8. **Customization Limits:** How much can tenants customize?
9. **Data Residency:** Single-region? Multi-region options?
10. **Compliance Certifications:** SOC 2? ISO 27001? GDPR-compliant?

### Assumptions Requiring Validation:
1. Platform targets Indian market (based on seed data: Mumbai, Delhi, Bangalore territories, +91 phone numbers)
2. B2B SaaS model (not B2C)
3. Sales team size: 5-50 reps per tenant (INFERRED)
4. Lead volume: 100-10,000 leads per tenant (INFERRED)

---

## Business Glossary

| Term | Definition | Context |
|------|------------|---------|
| **Tenant** | Isolated customer organization | Multi-tenancy root entity |
| **Lead** | Potential customer/prospect | Core business object |
| **Sequence** | Multi-step outreach campaign | Automation workflow |
| **Enrollment** | Adding lead to sequence | Campaign activation |
| **Engagement Event** | Tracked interaction (open/click/download) | Behavioral signal |
| **Scoring Profile** | Lead qualification rules | Conversion probability |
| **Routing Rule** | Auto-assignment logic | Lead distribution |
| **Application Type** | Vertical-specific inquiry type | Lead categorization |
| **Rep Tag** | Specialization label (retail, b2b, online) | Skill-based routing |
| **Nurturing Settings** | Tenant outreach constraints | Compliance guardrails |

---

## Recommended Business Domain Learning Path

### Day 1: Fundamentals
1. Understand multi-tenancy concept
2. Learn lead lifecycle states
3. Review vertical-specific terminology
4. Study user roles and permissions

### Day 2: Workflows
1. Trace lead acquisition flow
2. Understand sequence automation
3. Learn scoring mechanics
4. Review routing logic

### Day 3: Advanced
1. Audit trail and compliance
2. Asset management workflows
3. Bulk import processes
4. Analytics and KPIs

---

**Document Status:** Business domain reconstructed from codebase  
**Validation Required:** Pricing model, target market, competitive positioning  
**Confidence:** 75% overall (high for workflows, low for business strategy)
