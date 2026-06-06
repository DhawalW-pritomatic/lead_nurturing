# 📧 Automated Email System Architecture

## 🎯 System Overview

This document describes the production-ready automated email system for Pritomatic CRM. The system supports two types of email automation:

1. **Day-Offset Scheduler** - Simple time-based emails (e.g., "Send welcome email 3 days after lead creation")
2. **Multi-Step Sequences** - Complex drip campaigns with multiple touchpoints

---

## 🏗️ Architecture Components

### **1. Database Layer**

#### **Models:**

```
EmailSchedule
├── id (UUID)
├── tenant_id (UUID)
├── name (String)
├── template_id (UUID) → Template
├── day_offset (Integer) - Days after lead creation
├── target_lead_type (String, optional)
├── target_lead_status (String, optional)
├── is_active (Boolean)
├── last_run_at (Timestamp)
└── created_by (UUID) → User

Sequence
├── id (UUID)
├── tenant_id (UUID)
├── name (String)
├── trigger_type (Enum: 'lead_created', 'status_change', 'score_threshold', 'manual')
├── lead_type_target (String, optional)
├── steps (JSONB Array) - Sequence configuration
│   └── [
│       {
│         step_number: 1,
│         action: 'email',
│         template_id: 'uuid',
│         delay_value: 0,
│         delay_unit: 'days'
│       },
│       {
│         step_number: 2,
│         action: 'email',
│         template_id: 'uuid',
│         delay_value: 3,
│         delay_unit: 'days'
│       }
│     ]
├── status (Enum: 'draft', 'active', 'archived')
└── created_by (UUID) → User

SequenceEnrollment
├── id (UUID)
├── tenant_id (UUID)
├── lead_id (UUID) → Lead
├── sequence_id (UUID) → Sequence
├── current_step (Integer) - Current step index (0-based)
├── started_at (Timestamp)
├── next_step_at (Timestamp) - When to execute next step
├── status (Enum: 'active', 'paused', 'completed', 'exited')
├── completed_at (Timestamp)
└── exit_reason (String)

Template
├── id (UUID)
├── tenant_id (UUID)
├── name (String)
├── category (String)
├── subject (String) - Supports {{variables}}
├── body (HTML) - Supports {{variables}}
└── is_active (Boolean)

OutreachRecord
├── id (UUID)
├── tenant_id (UUID)
├── lead_id (UUID) → Lead
├── template_id (UUID) → Template
├── sequence_step (Integer, optional) - Tracks which sequence step sent this
├── subject_line (String)
├── body_preview (Text)
├── sent_at (Timestamp)
├── opened_at (Timestamp)
├── clicked_at (Timestamp)
├── replied_at (Timestamp)
├── status (Enum: 'pending', 'sent', 'failed', 'bounced')
└── tracking_id (String) - For open/click tracking

NurturingSettings
├── id (UUID)
├── tenant_id (UUID)
├── global_pause (Boolean) - Master kill switch
├── allowed_send_days (Array: ['Monday', 'Tuesday', ...])
├── send_time_start (Time: '09:00')
├── send_time_end (Time: '17:00')
└── max_emails_per_day (Integer)
```

---

### **2. Service Layer**

#### **SchedulerService** (`/backend/src/modules/scheduler/services/schedulerService.ts`)

**Purpose:** Handles day-offset based email automation

**Key Methods:**
- `runAllSchedules()` - Execute all active schedules across all tenants
- `executeSchedule(schedule)` - Process a single schedule
- `createSchedule()` - Create new schedule
- `toggleSchedule()` - Enable/disable schedule

**Logic:**
```javascript
1. Find leads created exactly day_offset days ago
2. Filter by target_lead_type and target_lead_status (if specified)
3. Check nurturing settings (global pause, allowed days, business hours)
4. Send email to each matching lead
5. Update last_run_at timestamp
6. Send notifications for success/failure
```

**Example:**
```
Schedule: "Welcome Email - Day 3"
day_offset: 3
template: "Welcome Template"

Execution (May 30, 2026):
→ Find leads created on May 27, 2026
→ Send welcome email to each
```

---

#### **SequenceService** (`/backend/src/modules/sequences/services/sequenceService.ts`)

**Purpose:** Handles multi-step sequence automation

**Key Methods:**

| Method | Purpose | Called By |
|--------|---------|-----------|
| `processPendingSteps()` | Execute due sequence steps | Cron (every 15 min) |
| `autoEnrollLeads()` | Check for new leads to enroll | Cron (hourly) |
| `enrollLead()` | Manually enroll lead | API endpoint |
| `pauseEnrollment()` | Pause enrollment | API endpoint |
| `resumeEnrollment()` | Resume paused enrollment | API endpoint |
| `exitEnrollment()` | Exit enrollment with reason | API endpoint |
| `getEnrollmentStats()` | Get analytics | Dashboard |

**Logic Flow:**

```
processPendingSteps():
  ↓
1. Query: Find enrollments where next_step_at <= now() AND status = 'active'
  ↓
2. For each enrollment:
   a. Get current sequence step from steps[current_step]
   b. Check nurturing settings (pause, allowed days, business hours)
   c. Execute step based on action type:
      - email: Send email via OutreachService
      - wait: Just update next_step_at
      - task: Create notification for rep
   d. Calculate next_step_at based on delay_value and delay_unit
   e. Increment current_step
   f. If current_step >= total_steps: Mark as completed
  ↓
3. Return summary statistics
```

**Example Sequence Flow:**

```
Sequence: "New Lead Nurture"
Steps:
  [0] action: email, template: "Welcome", delay: 0 days
  [1] action: email, template: "Features", delay: 2 days  
  [2] action: email, template: "Case Study", delay: 5 days
  [3] action: email, template: "Special Offer", delay: 7 days

Timeline:
Day 0 (Lead Created):
  → Enrollment created
  → current_step = 0
  → next_step_at = now() (immediate)
  
Day 0 (15 min later, cron runs):
  → processPendingSteps() finds this enrollment
  → Sends "Welcome" email
  → current_step = 1
  → next_step_at = now() + 2 days
  
Day 2 (cron runs):
  → Sends "Features" email
  → current_step = 2
  → next_step_at = now() + 5 days
  
Day 7 (cron runs):
  → Sends "Case Study" email
  → current_step = 3
  → next_step_at = now() + 7 days
  
Day 14 (cron runs):
  → Sends "Special Offer" email
  → current_step = 4
  → current_step >= total_steps (4)
  → Mark enrollment as 'completed'
```

---

#### **OutreachService** (`/backend/src/modules/outreach/services/outreachService.ts`)

**Purpose:** Low-level email sending via Nodemailer

**Key Method:**
```typescript
sendEmail(
  tenantId: string,
  leadId: string,
  templateId: string,
  repId?: string,
  sequenceStep?: number,  // NEW: tracks which sequence step
  assetIds?: string[]
)
```

**Features:**
- Template variable substitution (`{{lead.first_name}}`, etc.)
- Email tracking pixel for opens
- Click tracking links
- Unsubscribe links
- Asset attachments from library
- Creates OutreachRecord for history
- Sends success/failure notifications

---

### **3. Cron Job Layer** (`/backend/src/cron/index.ts`)

**Schedule:**

| Cron Schedule | Frequency | Service Called | Purpose |
|--------------|-----------|----------------|---------|
| `0 9 * * *` | Daily at 9 AM | `schedulerService.runAllSchedules()` | Execute day-offset schedules |
| `0 10-18 * * 1-6` | Every hour 10AM-6PM Mon-Sat | `schedulerService.runAllSchedules()` | Backup check for missed schedules |
| `*/15 * * * *` | Every 15 minutes | `sequenceService.processPendingSteps()` | Execute pending sequence steps |
| `0 * * * *` | Every hour | `sequenceService.autoEnrollLeads()` | Auto-enroll matching leads |

**Why Every 15 Minutes for Sequences?**
- Balance between real-time and server load
- Allows delays as short as 15 minutes between steps
- Processes max 100 enrollments per run to prevent overload
- Can handle ~9,600 sequence steps per day (96 runs × 100)

---

## ⚙️ Performance Optimizations

### **1. Database Query Optimization**

```typescript
// ✅ GOOD: Single query with proper indexes
const pendingEnrollments = await SequenceEnrollment.findAll({
  where: {
    status: 'active',
    next_step_at: { [Op.lte]: now },  // Uses index
  },
  limit: 100,  // Prevent overload
  include: [/* eager load relations */]
});

// ❌ BAD: N+1 query problem
const enrollments = await SequenceEnrollment.findAll();
for (const enrollment of enrollments) {
  const sequence = await Sequence.findByPk(enrollment.sequence_id); // N queries!
}
```

**Indexes Created:**
```sql
-- SequenceEnrollment
CREATE INDEX idx_enrollment_pending ON sequence_enrollments (status, next_step_at);
CREATE INDEX idx_enrollment_lead ON sequence_enrollments (tenant_id, lead_id);

-- EmailSchedule  
CREATE INDEX idx_schedule_active ON email_schedules (tenant_id, is_active);
CREATE INDEX idx_schedule_offset ON email_schedules (tenant_id, day_offset);

-- OutreachRecord
CREATE INDEX idx_outreach_lead ON outreach_records (tenant_id, lead_id);
CREATE INDEX idx_outreach_tracking ON outreach_records (tracking_id);
```

---

### **2. Batch Processing**

```typescript
// Process max 100 enrollments per cron run
limit: 100

// Why?
// - Prevents cron timeout (15 min window)
// - Limits email sending rate (avoid spam flags)
// - If backlog builds up, next run catches it
```

---

### **3. Email Rate Limiting**

**Current Implementation:**
- Natural rate limiting via cron frequency (every 15 min)
- Batch size limit (100 emails per run)
- Business hours restriction
- Allowed send days restriction

**Future Enhancement (Redis):**
```typescript
// Track emails sent per tenant per hour
const key = `email:rate:${tenantId}:${hour}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 3600);

if (count > nurturingSettings.max_emails_per_hour) {
  // Skip sending, reschedule
}
```

---

### **4. Graceful Failure Handling**

```typescript
// If one enrollment fails, continue with others
for (const enrollment of pendingEnrollments) {
  try {
    await this.processEnrollmentStep(enrollment);
    results.sent++;
  } catch (error: any) {
    results.failed++;
    results.errors.push({ enrollment_id: enrollment.id, error: error.message });
    // Continue to next enrollment
  }
}
```

**Error Recovery:**
- Failed emails don't block the queue
- Errors logged with context (enrollment_id, lead_id)
- Failed enrollments marked as 'exited' with reason
- Notifications sent to assigned rep

---

### **5. Nurturing Settings Respect**

Every email send checks tenant settings:

```typescript
// Global pause (emergency stop)
if (nurturingSettings?.global_pause) {
  return { skipped: true, reason: 'global_pause' };
}

// Allowed send days
const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
if (!nurturingSettings.allowed_send_days.includes(today)) {
  // Reschedule to tomorrow
  const tomorrow = new Date(next_step_at);
  tomorrow.setDate(tomorrow.getDate() + 1);
  await SequenceEnrollment.update({ next_step_at: tomorrow });
  return { skipped: true, reason: 'not_allowed_day' };
}

// Business hours
const currentHour = new Date().getHours();
if (currentHour < startHour || currentHour >= endHour) {
  // Reschedule to next business hour
  const nextSend = calculateNextBusinessHour();
  await SequenceEnrollment.update({ next_step_at: nextSend });
  return { skipped: true, reason: 'outside_business_hours' };
}
```

**Benefits:**
- Tenant-level control
- Prevents emails at 2 AM
- Respects weekend preferences
- Emergency stop capability

---

## 🚀 Production Deployment Checklist

### **1. Environment Variables**

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Pritomatic <info@pritomatic.in>

# Server URLs
BASE_URL=https://api.pritomatic.in
FRONTEND_URL=https://app.pritomatic.in

# Database
DATABASE_URL=postgres://user:pass@host:5432/db

# Redis (for future caching)
REDIS_URL=redis://localhost:6379
```

---

### **2. Gmail SMTP Limits**

**Free Gmail Account:**
- Limit: 500 emails/day
- Solution: Use multiple Gmail accounts or upgrade to Google Workspace

**Google Workspace:**
- Limit: 2,000 emails/day per user
- Recommended for production

**Alternative Providers:**

| Provider | Free Tier | Paid Plan | Best For |
|----------|-----------|-----------|----------|
| SendGrid | 100/day | $15/month for 40k | High volume |
| Mailgun | 5,000/month | $35/month for 50k | Developers |
| Amazon SES | 62,000/month* | $0.10 per 1,000 | AWS users |

*If sending from EC2

---

### **3. Monitoring & Alerts**

**Log Monitoring:**
```bash
# View cron execution logs
pm2 logs nexcrm-backend | grep CRON

# Track sequence processing
pm2 logs nexcrm-backend | grep SequenceService

# Monitor email sending
pm2 logs nexcrm-backend | grep OutreachService
```

**Metrics to Track:**
- Emails sent per day/hour
- Failure rate
- Average sequence completion rate
- Cron execution time
- Queue backlog size

**Recommended Tools:**
- Sentry for error tracking
- DataDog/New Relic for performance
- PagerDuty for alerts

---

### **4. Database Maintenance**

**Cleanup Old Records:**
```sql
-- Archive old outreach records (keep last 90 days)
DELETE FROM outreach_records 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Archive completed enrollments (keep last 180 days)
DELETE FROM sequence_enrollments 
WHERE status = 'completed' 
  AND completed_at < NOW() - INTERVAL '180 days';
```

**Vacuum Database (PostgreSQL):**
```sql
VACUUM ANALYZE sequence_enrollments;
VACUUM ANALYZE outreach_records;
```

---

### **5. Scaling Considerations**

**Current Capacity:**
- 100 sequence steps per 15 min = 9,600 steps/day
- Gmail limit: 500 emails/day per account

**When to Scale:**

| Metric | Threshold | Action |
|--------|-----------|--------|
| Emails/day | > 400 | Upgrade to SendGrid/Mailgun |
| Sequence backlog | > 500 pending | Reduce cron interval to 10 min |
| Cron execution time | > 10 min | Increase batch processing limit |
| Database queries | > 1000 QPS | Add read replicas |

**Horizontal Scaling:**
```typescript
// Shard by tenant_id
const shardId = hash(tenantId) % NUM_SHARDS;

// Process only enrollments for this shard
where: {
  status: 'active',
  next_step_at: { [Op.lte]: now },
  tenant_id: { [Op.in]: getShardsForWorker(workerId) }
}
```

---

## 📊 Usage Examples

### **Example 1: Simple Welcome Email (Day-Offset Scheduler)**

**Setup:**
1. Create template: "Welcome Email"
2. Create schedule:
   ```json
   {
     "name": "Welcome - Day 0",
     "template_id": "template-uuid",
     "day_offset": 0,
     "target_lead_type": null,
     "target_lead_status": null,
     "is_active": true
   }
   ```

**Result:**
- New lead created → Email sent at next 9 AM run (or hourly backup)

---

### **Example 2: Multi-Step Nurture Sequence**

**Setup:**
1. Create templates:
   - "Welcome"
   - "Product Features"
   - "Customer Success Story"
   - "Limited Time Offer"

2. Create sequence:
   ```json
   {
     "name": "MQL Nurture Sequence",
     "trigger_type": "manual",
     "status": "active",
     "steps": [
       {
         "step_number": 1,
         "action": "email",
         "template_id": "welcome-template-uuid",
         "delay_value": 0,
         "delay_unit": "minutes"
       },
       {
         "step_number": 2,
         "action": "email",
         "template_id": "features-template-uuid",
         "delay_value": 2,
         "delay_unit": "days"
       },
       {
         "step_number": 3,
         "action": "email",
         "template_id": "story-template-uuid",
         "delay_value": 5,
         "delay_unit": "days"
       },
       {
         "step_number": 4,
         "action": "email",
         "template_id": "offer-template-uuid",
         "delay_value": 7,
         "delay_unit": "days"
       }
     ]
   }
   ```

3. Enroll lead:
   ```bash
   POST /api/sequences/enroll
   {
     "lead_id": "lead-uuid",
     "sequence_id": "sequence-uuid"
   }
   ```

**Timeline:**
```
Day 0, 10:00 AM: Lead enrolled
Day 0, 10:15 AM: Cron runs → Welcome email sent
Day 2, 10:15 AM: Cron runs → Features email sent
Day 7, 10:15 AM: Cron runs → Story email sent
Day 14, 10:15 AM: Cron runs → Offer email sent → Sequence completed
```

---

### **Example 3: Auto-Enrollment Based on Lead Type**

**Setup:**
```json
{
  "name": "Enterprise Lead Sequence",
  "trigger_type": "lead_created",
  "lead_type_target": "enterprise",
  "status": "active",
  "steps": [/* ... */]
}
```

**Result:**
- Hourly cron checks for new enterprise leads
- Auto-enrolls them into sequence
- No manual enrollment needed

---

## 🔍 Troubleshooting

### **Problem: Emails not sending**

**Check:**
1. Is sequence/schedule active?
   ```sql
   SELECT status FROM sequences WHERE id = 'uuid';
   SELECT is_active FROM email_schedules WHERE id = 'uuid';
   ```

2. Check nurturing settings:
   ```sql
   SELECT global_pause, allowed_send_days, send_time_start, send_time_end
   FROM nurturing_settings WHERE tenant_id = 'uuid';
   ```

3. Check cron logs:
   ```bash
   pm2 logs nexcrm-backend | grep "Processing sequence steps"
   ```

4. Check enrollment status:
   ```sql
   SELECT status, next_step_at, current_step
   FROM sequence_enrollments 
   WHERE lead_id = 'uuid' AND sequence_id = 'uuid';
   ```

---

### **Problem: Sequence stuck on same step**

**Causes:**
- `next_step_at` is in the future
- Enrollment status is 'paused'
- Global pause is active
- Outside business hours

**Fix:**
```sql
-- Check next_step_at
SELECT next_step_at, NOW() FROM sequence_enrollments WHERE id = 'uuid';

-- Manually advance step (emergency)
UPDATE sequence_enrollments 
SET current_step = current_step + 1,
    next_step_at = NOW()
WHERE id = 'uuid';
```

---

### **Problem: High email failure rate**

**Check OutreachRecord failures:**
```sql
SELECT failure_reason, COUNT(*) 
FROM outreach_records 
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY failure_reason;
```

**Common causes:**
- Invalid email addresses
- SMTP authentication failure
- Gmail daily limit exceeded
- Lead opted out

---

## 📈 Analytics & Reporting

### **Sequence Performance Metrics**

```sql
-- Completion rate by sequence
SELECT 
  s.name,
  COUNT(*) as total_enrollments,
  COUNT(*) FILTER (WHERE se.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE se.status = 'active') as active,
  COUNT(*) FILTER (WHERE se.status = 'exited') as exited,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE se.status = 'completed') / COUNT(*),
    2
  ) as completion_rate
FROM sequence_enrollments se
JOIN sequences s ON se.sequence_id = s.id
WHERE se.tenant_id = 'uuid'
GROUP BY s.id, s.name
ORDER BY completion_rate DESC;
```

### **Email Performance**

```sql
-- Open and click rates
SELECT 
  t.name as template,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked,
  ROUND(100.0 * COUNT(*) FILTER (WHERE opened_at IS NOT NULL) / COUNT(*), 2) as open_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) / COUNT(*), 2) as click_rate
FROM outreach_records o
JOIN templates t ON o.template_id = t.id
WHERE o.tenant_id = 'uuid'
  AND o.sent_at > NOW() - INTERVAL '30 days'
GROUP BY t.id, t.name
ORDER BY open_rate DESC;
```

---

## 🎓 Best Practices

### **1. Sequence Design**

**✅ DO:**
- Start with immediate email (delay: 0)
- Space emails 2-7 days apart
- Use 3-5 steps max for most sequences
- A/B test subject lines
- Include clear CTAs
- Add unsubscribe link

**❌ DON'T:**
- Send more than 1 email per day to same lead
- Use generic content
- Continue after lead replies (implement reply detection)
- Enroll in multiple sequences simultaneously

---

### **2. Template Variables**

**Available Variables:**
```
{{lead.first_name}}
{{lead.last_name}}
{{lead.company}}
{{lead.city}}
{{rep.name}}
{{rep.email}}
{{rep.phone}}
{{company.name}}
{{enrollment.date}}
{{tracking.cta_url}}
```

**Example:**
```html
Hi {{lead.first_name}},

I noticed you're from {{lead.city}}. We've helped companies like {{lead.company}} 
achieve 3x ROI in their first quarter.

Want to learn how?

<a href="{{tracking.cta_url}}">Book a demo</a>

Best,
{{rep.name}}
{{rep.email}}
```

---

### **3. Testing Sequences**

**Before Going Live:**

1. **Create test lead** with your email
2. **Enroll in sequence**
3. **Monitor cron logs**:
   ```bash
   pm2 logs nexcrm-backend --lines 100
   ```
4. **Verify emails received** at correct intervals
5. **Test tracking** (opens, clicks)
6. **Test pause/resume/exit**

---

### **4. Compliance**

**CAN-SPAM Act Requirements:**
- ✅ Accurate "From" name
- ✅ Truthful subject lines
- ✅ Identify as advertisement (if applicable)
- ✅ Include physical address
- ✅ Provide unsubscribe mechanism
- ✅ Honor opt-outs within 10 business days

**GDPR Requirements:**
- ✅ Obtain consent before emailing
- ✅ Store consent record
- ✅ Allow data export/deletion
- ✅ Include privacy policy link

---

## 🔮 Future Enhancements

### **Phase 1: Reply Detection**
- Parse incoming emails via IMAP
- Automatically exit sequence when lead replies
- Create notification for rep

### **Phase 2: Conditional Logic**
```json
{
  "step_number": 2,
  "action": "conditional",
  "condition": "email_opened",
  "if_true": { "next_step": 3 },
  "if_false": { "next_step": 4 }
}
```

### **Phase 3: A/B Testing**
```json
{
  "step_number": 1,
  "action": "ab_test",
  "variants": [
    { "template_id": "variant-a", "percentage": 50 },
    { "template_id": "variant-b", "percentage": 50 }
  ]
}
```

### **Phase 4: SMS Integration**
```json
{
  "step_number": 2,
  "action": "sms",
  "message": "Hi {{lead.first_name}}, just following up on our email...",
  "delay_value": 1,
  "delay_unit": "hours"
}
```

---

## 📞 Support

**For questions or issues:**
- Technical Lead: [Your Name]
- Documentation: `/docs/EMAIL_AUTOMATION_ARCHITECTURE.md`
- Codebase: 
  - `/backend/src/modules/sequences/services/sequenceService.ts`
  - `/backend/src/modules/scheduler/services/schedulerService.ts`
  - `/backend/src/cron/index.ts`

---

**Last Updated:** May 30, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
