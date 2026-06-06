# 🏢 Multi-Tenant Scheduler Workflow

## 📋 Overview

This document explains **exactly** how the automated email system works across multiple tenants, how templates are used, and how schedules execute.

---

## 🎯 The Big Picture

```
Multiple Tenants → Multiple Schedules → Multiple Templates → Automated Emails
```

**Key Concept:** Each tenant has their own schedules and templates, but all are processed by a single cron job that runs every 2 minutes (testing) / 15 minutes (production).

---

## 🏗️ System Components

### **1. Tenants (Companies using the CRM)**

```
Tenant 1: EduVantage Institute
├── 5 Users
├── 100 Leads
├── 10 Templates
└── 3 Active Sequences

Tenant 2: Zomato
├── 8 Users  
├── 200 Leads
├── 15 Templates
└── 5 Active Sequences

Tenant 3: UrbanClap
├── 3 Users
├── 50 Leads
├── 8 Templates
└── 2 Active Sequences

... (up to 6 tenants in your seed data)
```

**Isolation:** Each tenant's data is completely separate. Tenant 1 cannot see Tenant 2's templates, leads, or sequences.

---

## 🔄 How the Cron Job Works (Every 2 Minutes)

### **Timeline Example:**

```
10:00 AM - Cron job starts
  ↓
10:00:01 - Query database for ALL active sequences across ALL tenants
  ↓
10:00:02 - Query for ALL pending enrollments (where next_step_at <= now)
  ↓
10:00:03 - Process each enrollment one by one
  ↓
  Process Tenant 1's enrollments
  Process Tenant 2's enrollments  
  Process Tenant 3's enrollments
  ↓
10:00:45 - All processing complete
  ↓
10:02 AM - Next cron run starts
```

---

## 📊 Detailed Workflow: Single Cron Run

### **Step 1: Find Pending Work**

```sql
-- The cron job runs this query:
SELECT * FROM sequence_enrollments
WHERE status = 'active'
  AND next_step_at <= NOW()
LIMIT 100;

-- Returns enrollments from ALL tenants mixed together:
[
  { id: 'enr-1', tenant_id: 'tenant-1-uuid', lead_id: 'lead-a', sequence_id: 'seq-1' },
  { id: 'enr-2', tenant_id: 'tenant-2-uuid', lead_id: 'lead-b', sequence_id: 'seq-2' },
  { id: 'enr-3', tenant_id: 'tenant-1-uuid', lead_id: 'lead-c', sequence_id: 'seq-1' },
  { id: 'enr-4', tenant_id: 'tenant-3-uuid', lead_id: 'lead-d', sequence_id: 'seq-3' },
  ... up to 100 enrollments
]
```

**Key Point:** The cron job processes ALL tenants together, not one tenant at a time.

---

### **Step 2: Process Each Enrollment**

For each enrollment found:

```javascript
// ENROLLMENT #1: Tenant 1 - EduVantage
enrollment: {
  id: 'enr-1',
  tenant_id: 'eduvantage-uuid',
  lead_id: 'lead-123',
  sequence_id: 'seq-welcome',
  current_step: 0,  // First step
  next_step_at: '2026-05-30 10:00:00'
}

↓ Get the sequence

sequence: {
  id: 'seq-welcome',
  tenant_id: 'eduvantage-uuid',
  name: 'New Student Welcome',
  steps: [
    {
      step_number: 1,
      action: 'email',
      template_id: 'template-welcome-edu',  ← Template ID
      delay_value: 0,
      delay_unit: 'minutes'
    },
    {
      step_number: 2,
      action: 'email',
      template_id: 'template-courses-edu',
      delay_value: 2,
      delay_unit: 'days'
    }
  ]
}

↓ Get the template for current step

template: {
  id: 'template-welcome-edu',
  tenant_id: 'eduvantage-uuid',  ← Must match enrollment's tenant!
  name: 'Welcome to EduVantage',
  subject: 'Welcome {{lead.first_name}}!',
  body: '<h1>Welcome to EduVantage Institute</h1>...'
}

↓ Get the lead

lead: {
  id: 'lead-123',
  tenant_id: 'eduvantage-uuid',
  first_name: 'Ravi',
  last_name: 'Kulkarni',
  email: 'leads_edu@example.com'
}

↓ Send email

Email Details:
  From: Pritomatic <info@pritomatic.in>
  To: leads_edu@example.com
  Subject: Welcome Ravi!  ← Variables replaced
  Body: <h1>Welcome to EduVantage Institute</h1>
        <p>Dear Ravi Kulkarni,</p>
        <p>Welcome to our platform...</p>

↓ Update enrollment

enrollment updated:
  current_step: 1  ← Moved to next step
  next_step_at: '2026-06-01 10:00:00'  ← 2 days from now
```

---

### **Step 3: Next Enrollment (Different Tenant)**

```javascript
// ENROLLMENT #2: Tenant 2 - Zomato
enrollment: {
  id: 'enr-2',
  tenant_id: 'zomato-uuid',
  lead_id: 'lead-456',
  sequence_id: 'seq-restaurant',
  current_step: 1,  // Second step
  next_step_at: '2026-05-30 10:01:00'
}

↓ Get the sequence (Zomato's sequence, different from EduVantage)

sequence: {
  id: 'seq-restaurant',
  tenant_id: 'zomato-uuid',
  name: 'Restaurant Onboarding',
  steps: [
    {
      step_number: 1,
      action: 'email',
      template_id: 'template-welcome-zomato',
      delay_value: 0,
      delay_unit: 'minutes'
    },
    {
      step_number: 2,
      action: 'email',
      template_id: 'template-menu-setup',  ← Different template
      delay_value: 1,
      delay_unit: 'days'
    }
  ]
}

↓ Get the template (Zomato's template)

template: {
  id: 'template-menu-setup',
  tenant_id: 'zomato-uuid',  ← Zomato's template
  name: 'Set Up Your Menu',
  subject: 'Time to add your dishes, {{lead.company}}!',
  body: '<h1>Let\'s set up your restaurant menu</h1>...'
}

↓ Send email with Zomato's template to Zomato's lead
```

---

## 🔒 Tenant Isolation Guarantees

### **How Isolation is Maintained:**

```javascript
// When fetching template in OutreachService:
const template = await Template.findOne({
  where: {
    id: templateId,
    tenant_id: tenantId  ← CRITICAL: Must match!
  }
});

// If Tenant 1 tries to use Tenant 2's template, it returns null
// Email sending fails with "Template not found"
```

**Example of Failed Cross-Tenant Access:**

```javascript
// Tenant 1 (EduVantage) tries to use Tenant 2's (Zomato) template
enrollment: {
  tenant_id: 'eduvantage-uuid',
  ...
}

sequence.steps[0]: {
  template_id: 'zomato-template-uuid'  ← Wrong tenant!
}

↓

Database Query:
SELECT * FROM templates 
WHERE id = 'zomato-template-uuid' 
  AND tenant_id = 'eduvantage-uuid'  ← No match!

Result: Template not found
Email: Failed
Enrollment: Marked as 'exited' with reason "Template not found"
```

---

## 📧 Complete Multi-Tenant Example

### **Scenario: 3 Tenants, 6 Enrollments Pending**

**10:00 AM - Cron Starts**

```
Database State:
┌──────────────┬─────────────────┬──────────────┬──────────────┬─────────────┐
│ Enrollment   │ Tenant          │ Lead         │ Sequence     │ Next Step   │
├──────────────┼─────────────────┼──────────────┼──────────────┼─────────────┤
│ enr-1        │ EduVantage      │ Ravi         │ Welcome      │ 10:00 AM ✓  │
│ enr-2        │ Zomato          │ Restaurant A │ Onboard      │ 10:00 AM ✓  │
│ enr-3        │ EduVantage      │ Priya        │ Welcome      │ 10:01 AM ✓  │
│ enr-4        │ UrbanClap       │ Vendor B     │ Activation   │ 10:01 AM ✓  │
│ enr-5        │ Zomato          │ Restaurant B │ Onboard      │ 10:02 AM    │
│ enr-6        │ EduVantage      │ Amit         │ Nurture      │ 10:05 AM    │
└──────────────┴─────────────────┴──────────────┴──────────────┴─────────────┘

Query returns enr-1, enr-2, enr-3, enr-4 (next_step_at <= 10:02)
```

**Processing:**

```
10:00:01 - Process enr-1 (EduVantage)
  ├─ Get sequence "Welcome"
  ├─ Get template "Welcome to EduVantage" (template-1)
  ├─ Get lead "Ravi Kulkarni"
  ├─ Send email: "Welcome Ravi!" → leads_edu@example.com
  ├─ Update: current_step = 1, next_step_at = 2 days later
  └─ Result: ✅ Sent

10:00:15 - Process enr-2 (Zomato)
  ├─ Get sequence "Onboard"
  ├─ Get template "Restaurant Setup Guide" (template-5)
  ├─ Get lead "Restaurant A"
  ├─ Send email: "Let's get started!" → restaurant-a@zomato.com
  ├─ Update: current_step = 1, next_step_at = 1 day later
  └─ Result: ✅ Sent

10:00:28 - Process enr-3 (EduVantage)
  ├─ Get sequence "Welcome"
  ├─ Get template "Welcome to EduVantage" (template-1) ← Same as enr-1
  ├─ Get lead "Priya Sharma"
  ├─ Send email: "Welcome Priya!" → priya@example.com
  ├─ Update: current_step = 1, next_step_at = 2 days later
  └─ Result: ✅ Sent

10:00:42 - Process enr-4 (UrbanClap)
  ├─ Get sequence "Activation"
  ├─ Get template "Activate Your Service" (template-9)
  ├─ Get lead "Vendor B"
  ├─ Send email: "Complete your profile" → vendor@urbanclap.com
  ├─ Update: current_step = 1, next_step_at = 3 days later
  └─ Result: ✅ Sent

10:00:55 - Cron job complete
  Summary:
    Processed: 4 enrollments
    Sent: 4 emails
    Failed: 0
    Tenants involved: 3 (EduVantage, Zomato, UrbanClap)
```

---

## 🎨 Template Usage Across Tenants

### **Example: Same Template Name, Different Content**

```
EduVantage (Tenant 1):
Template: "Welcome Email"
  Subject: "Welcome to EduVantage Institute, {{lead.first_name}}!"
  Body: "Start your learning journey with us..."

Zomato (Tenant 2):
Template: "Welcome Email"  ← Same name, but different!
  Subject: "Welcome to Zomato Partners, {{lead.company}}!"
  Body: "Let's get your restaurant online..."

UrbanClap (Tenant 3):
Template: "Welcome Email"  ← Again, same name
  Subject: "Welcome to UrbanClap, {{lead.first_name}}!"
  Body: "Start providing services today..."
```

**Why This Works:**

```sql
-- Each template has tenant_id, so names can be the same
templates table:
┌────────────┬──────────────┬──────────────┬─────────────────────────┐
│ id         │ tenant_id    │ name         │ subject                 │
├────────────┼──────────────┼──────────────┼─────────────────────────┤
│ template-1 │ eduvantage   │ Welcome      │ Welcome to EduVantage   │
│ template-5 │ zomato       │ Welcome      │ Welcome to Zomato       │
│ template-9 │ urbanclap    │ Welcome      │ Welcome to UrbanClap    │
└────────────┴──────────────┴──────────────┴─────────────────────────┘

Each sequence references their own tenant's template:
EduVantage Sequence → template-1
Zomato Sequence → template-5
UrbanClap Sequence → template-9
```

---

## ⚙️ How Scheduler Picks Templates

### **Step-by-Step Template Selection:**

```javascript
// 1. Cron finds pending enrollment
enrollment = {
  tenant_id: 'eduvantage-uuid',
  sequence_id: 'seq-123',
  current_step: 0
}

// 2. Get sequence
sequence = await Sequence.findOne({
  where: { 
    id: 'seq-123',
    tenant_id: 'eduvantage-uuid'  ← Ensures it's EduVantage's sequence
  }
})

// 3. Get current step configuration
currentStep = sequence.steps[0]  // { template_id: 'template-welcome-123' }

// 4. Get template WITH tenant verification
template = await Template.findOne({
  where: {
    id: 'template-welcome-123',
    tenant_id: 'eduvantage-uuid'  ← DOUBLE CHECK: Must match enrollment's tenant
  }
})

// 5. If template.tenant_id doesn't match enrollment.tenant_id:
if (!template) {
  // Email fails - cannot use other tenant's template!
  throw new Error('Template not found')
}

// 6. Use template to send email
await sendEmail({
  to: lead.email,
  subject: template.subject,
  body: template.body
})
```

---

## 🔍 Real Database Queries

### **Query 1: Find Pending Enrollments (Every 2 Minutes)**

```sql
SELECT 
  se.id as enrollment_id,
  se.tenant_id,
  se.lead_id,
  se.sequence_id,
  se.current_step,
  se.next_step_at,
  s.name as sequence_name,
  s.steps as sequence_steps,
  l.first_name,
  l.last_name,
  l.email,
  t.name as tenant_name
FROM sequence_enrollments se
JOIN sequences s ON se.sequence_id = s.id
JOIN leads l ON se.lead_id = l.id
JOIN tenants t ON se.tenant_id = t.id
WHERE se.status = 'active'
  AND se.next_step_at <= NOW()
  AND s.status = 'active'
  AND t.is_active = true
  AND l.opted_out = false
LIMIT 100;
```

**Example Result:**

```
┌──────────────┬──────────────┬──────────┬──────────┬──────────┬─────────────────────┬──────────┐
│ enrollment_id│ tenant_id    │ lead_id  │ sequence │ step     │ next_step_at        │ tenant   │
├──────────────┼──────────────┼──────────┼──────────┼──────────┼─────────────────────┼──────────┤
│ enr-001      │ tenant-edu   │ lead-100 │ seq-wel  │ 0        │ 2026-05-30 10:00:00 │ EduV     │
│ enr-002      │ tenant-zom   │ lead-200 │ seq-onb  │ 1        │ 2026-05-30 10:00:30 │ Zomato   │
│ enr-003      │ tenant-edu   │ lead-101 │ seq-wel  │ 0        │ 2026-05-30 10:01:00 │ EduV     │
│ enr-004      │ tenant-urb   │ lead-300 │ seq-act  │ 2        │ 2026-05-30 10:01:15 │ UrbanC   │
└──────────────┴──────────────┴──────────┴──────────┴──────────┴─────────────────────┴──────────┘
```

---

### **Query 2: Get Template for Specific Step**

```sql
SELECT * FROM templates
WHERE id = 'template-welcome-edu'
  AND tenant_id = 'eduvantage-uuid'
  AND is_active = true;
```

**Result:**

```json
{
  "id": "template-welcome-edu",
  "tenant_id": "eduvantage-uuid",
  "name": "Welcome to EduVantage",
  "category": "welcome",
  "subject": "Welcome {{lead.first_name}}!",
  "body": "<h1>Welcome to EduVantage Institute</h1>\n<p>Dear {{lead.first_name}} {{lead.last_name}},</p>\n<p>We're excited to have you join us...</p>",
  "is_active": true
}
```

---

## 📊 Execution Log Example

### **Console Output During 2-Minute Cron Run:**

```bash
[2026-05-30 10:00:00] [CRON] 🔄 Processing sequence steps...
[2026-05-30 10:00:01] [SequenceService] Starting to process pending steps...
[2026-05-30 10:00:02] [SequenceService] Found 4 pending enrollments

[2026-05-30 10:00:03] [SequenceService] Processing enrollment enr-001
[2026-05-30 10:00:04]   └─ Tenant: EduVantage Institute (eduvantage-uuid)
[2026-05-30 10:00:05]   └─ Sequence: New Student Welcome
[2026-05-30 10:00:06]   └─ Lead: Ravi Kulkarni (leads_edu@example.com)
[2026-05-30 10:00:07]   └─ Step 1 of 3: Send email
[2026-05-30 10:00:08]   └─ Template: Welcome to EduVantage (template-welcome-edu)
[2026-05-30 10:00:12] [OutreachService] Sending email to leads_edu@example.com
[2026-05-30 10:00:13]   └─ Subject: Welcome Ravi!
[2026-05-30 10:00:15] [OutreachService] ✅ Email sent successfully
[2026-05-30 10:00:16] [SequenceService] Email sent to leads_edu@example.com, next step at 2026-06-01 10:00:00

[2026-05-30 10:00:17] [SequenceService] Processing enrollment enr-002
[2026-05-30 10:00:18]   └─ Tenant: Zomato (zomato-uuid)
[2026-05-30 10:00:19]   └─ Sequence: Restaurant Onboarding
[2026-05-30 10:00:20]   └─ Lead: The Spice Kitchen (restaurant-a@zomato.com)
[2026-05-30 10:00:21]   └─ Step 2 of 4: Send email
[2026-05-30 10:00:22]   └─ Template: Menu Setup Guide (template-menu-setup)
[2026-05-30 10:00:26] [OutreachService] Sending email to restaurant-a@zomato.com
[2026-05-30 10:00:27]   └─ Subject: Time to add your dishes, The Spice Kitchen!
[2026-05-30 10:00:29] [OutreachService] ✅ Email sent successfully
[2026-05-30 10:00:30] [SequenceService] Email sent to restaurant-a@zomato.com, next step at 2026-05-31 10:00:00

[2026-05-30 10:00:31] [SequenceService] Processing enrollment enr-003
[2026-05-30 10:00:32]   └─ Tenant: EduVantage Institute (eduvantage-uuid)
[2026-05-30 10:00:33]   └─ Sequence: New Student Welcome
[2026-05-30 10:00:34]   └─ Lead: Priya Sharma (priya@example.com)
[2026-05-30 10:00:35]   └─ Step 1 of 3: Send email
[2026-05-30 10:00:36]   └─ Template: Welcome to EduVantage (template-welcome-edu) ← Same template as enr-001
[2026-05-30 10:00:40] [OutreachService] Sending email to priya@example.com
[2026-05-30 10:00:41]   └─ Subject: Welcome Priya!
[2026-05-30 10:00:43] [OutreachService] ✅ Email sent successfully
[2026-05-30 10:00:44] [SequenceService] Email sent to priya@example.com, next step at 2026-06-01 10:00:00

[2026-05-30 10:00:45] [SequenceService] Processing enrollment enr-004
[2026-05-30 10:00:46]   └─ Tenant: UrbanClap (urbanclap-uuid)
[2026-05-30 10:00:47]   └─ Sequence: Service Provider Activation
[2026-05-30 10:00:48]   └─ Lead: John's Plumbing (vendor@urbanclap.com)
[2026-05-30 10:00:49]   └─ Step 3 of 5: Send email
[2026-05-30 10:00:50]   └─ Template: Portfolio Setup (template-portfolio)
[2026-05-30 10:00:54] [OutreachService] Sending email to vendor@urbanclap.com
[2026-05-30 10:00:55]   └─ Subject: Showcase your work, John's Plumbing!
[2026-05-30 10:00:57] [OutreachService] ✅ Email sent successfully
[2026-05-30 10:00:58] [SequenceService] Email sent to vendor@urbanclap.com, next step at 2026-06-02 10:00:00

[2026-05-30 10:00:59] [SequenceService] Processing complete:
[2026-05-30 10:01:00] [CRON] ✅ Sequence processing completed: {
  processed: 4,
  sent: 4,
  failed: 0,
  completed: 0,
  errors: 0
}

[2026-05-30 10:02:00] [CRON] 🔄 Processing sequence steps...
[2026-05-30 10:02:01] [SequenceService] Starting to process pending steps...
[2026-05-30 10:02:02] [SequenceService] Found 0 pending enrollments
[2026-05-30 10:02:03] [CRON] ✅ Sequence processing completed: {
  processed: 0,
  sent: 0,
  failed: 0,
  completed: 0,
  errors: 0
}
```

---

## 🧪 Testing the System

### **Test Scenario: Create and Monitor a 2-Step Sequence**

**Step 1: Create Templates**

```bash
# Via API or SQL
POST /api/templates
{
  "name": "Test Welcome",
  "category": "test",
  "subject": "Hello {{lead.first_name}}!",
  "body": "<p>This is step 1</p>",
  "is_active": true
}

POST /api/templates
{
  "name": "Test Follow-up",
  "category": "test",
  "subject": "Following up, {{lead.first_name}}",
  "body": "<p>This is step 2, sent 2 minutes after step 1</p>",
  "is_active": true
}
```

**Step 2: Create Sequence**

```bash
POST /api/sequences
{
  "name": "2-Minute Test Sequence",
  "trigger_type": "manual",
  "status": "active",
  "steps": [
    {
      "step_number": 1,
      "action": "email",
      "template_id": "template-welcome-uuid",
      "delay_value": 0,
      "delay_unit": "minutes"
    },
    {
      "step_number": 2,
      "action": "email",
      "template_id": "template-followup-uuid",
      "delay_value": 2,
      "delay_unit": "minutes"
    }
  ]
}
```

**Step 3: Enroll Yourself**

```bash
POST /api/sequences/enroll
{
  "lead_id": "your-test-lead-id",
  "sequence_id": "sequence-uuid"
}
```

**Step 4: Watch It Work**

```bash
# Start backend with logs
npm run dev

# Watch logs
10:00 AM - Enrollment created
10:00 AM - current_step = 0, next_step_at = now

10:02 AM - Cron runs
10:02 AM - Found 1 pending enrollment
10:02 AM - Send email #1 (Welcome)
10:02 AM - Updated: current_step = 1, next_step_at = 10:04 AM

10:04 AM - Cron runs
10:04 AM - Found 1 pending enrollment
10:04 AM - Send email #2 (Follow-up)
10:04 AM - Updated: current_step = 2
10:04 AM - Sequence completed (no more steps)
```

**Check Your Email:**
- 10:02 AM - Receive "Hello {Your Name}!" (Step 1)
- 10:04 AM - Receive "Following up, {Your Name}" (Step 2)

---

## 🚨 Common Issues & Solutions

### **Issue 1: "No emails being sent"**

**Check:**
```bash
# 1. Are there pending enrollments?
SELECT * FROM sequence_enrollments 
WHERE status = 'active' AND next_step_at <= NOW();

# 2. Is sequence active?
SELECT status FROM sequences WHERE id = 'your-sequence-id';

# 3. Is cron running?
pm2 logs nexcrm-backend | grep "Processing sequence steps"

# 4. Check tenant's nurturing settings
SELECT global_pause, allowed_send_days FROM nurturing_settings 
WHERE tenant_id = 'your-tenant-id';
```

---

### **Issue 2: "Wrong template being used"**

**This should NEVER happen** due to tenant isolation, but if it does:

```sql
-- Verify template belongs to correct tenant
SELECT id, tenant_id, name FROM templates WHERE id = 'template-id';

-- Verify sequence belongs to correct tenant  
SELECT id, tenant_id, name FROM sequences WHERE id = 'sequence-id';

-- Verify enrollment belongs to correct tenant
SELECT id, tenant_id FROM sequence_enrollments WHERE id = 'enrollment-id';

-- All three tenant_id values MUST match!
```

---

### **Issue 3: "Sequence stuck on same step"**

```sql
-- Check next_step_at
SELECT id, current_step, next_step_at, NOW() as current_time
FROM sequence_enrollments 
WHERE id = 'enrollment-id';

-- If next_step_at is in future, wait for it
-- If next_step_at is in past but still not processed:
--   1. Check cron is running
--   2. Check for errors in logs
--   3. Check if global_pause is enabled
```

---

## 📈 Performance Metrics

### **What to Monitor:**

```bash
# 1. Enrollments processed per cron run
SELECT COUNT(*) FROM sequence_enrollments 
WHERE status = 'active' AND next_step_at <= NOW();

# 2. Average cron execution time
# Look at logs: time between "Processing sequence steps" and "completed"

# 3. Email success rate
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM outreach_records
WHERE created_at > NOW() - INTERVAL '1 hour';

# 4. Sequences by tenant
SELECT 
  t.name as tenant,
  COUNT(*) as active_sequences
FROM sequences s
JOIN tenants t ON s.tenant_id = t.id
WHERE s.status = 'active'
GROUP BY t.id, t.name;
```

---

## 🎓 Summary

### **Key Takeaways:**

1. **One Cron Job, All Tenants**: Single cron processes all tenants together every 2 minutes
2. **Tenant Isolation**: Each query checks `tenant_id` - impossible to access other tenant's data
3. **Template Usage**: Sequences reference templates by ID, verified by tenant_id at send time
4. **Processing Order**: Enrollments processed in order of `next_step_at`, mixed across tenants
5. **Scalability**: Processes max 100 enrollments per run to prevent overload

### **Testing Mode:**
- ⚡ Sequences run every 2 minutes (vs 15 min production)
- ⚡ Auto-enrollment every 5 minutes (vs 1 hour production)
- 📝 Change back to production timing in `/backend/src/cron/index.ts`

---

**Last Updated:** May 30, 2026  
**Testing Mode:** ✅ Active  
**Production Ready:** Change cron schedules before deploying
