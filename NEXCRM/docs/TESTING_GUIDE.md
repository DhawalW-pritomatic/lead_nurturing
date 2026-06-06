# 🧪 Quick Testing Guide - Automated Email System

## ✅ Prerequisites Check

**1. Backend Running?**
```bash
cd /home/dhawal/NextgEN/NEXCRM/backend
npm run dev
```

**2. Docker Services Running?**
```bash
cd /home/dhawal/NextgEN/NEXCRM
sudo docker-compose ps

# Should show:
# nexcrm_postgres - Up
# nexcrm_redis    - Up
```

**3. Database Seeded?**
```bash
# Check if you have templates and leads
psql -h localhost -p 5433 -U nexcrm -d nexcrm -c "SELECT COUNT(*) FROM templates;"
psql -h localhost -p 5433 -U nexcrm -d nexcrm -c "SELECT COUNT(*) FROM leads;"
```

---

## 🚀 **METHOD 1: Quick Test via Database (Fastest)**

This method directly inserts test data - **takes 2 minutes total**!

### **Step 1: Get Your Tenant ID**

```bash
psql -h localhost -p 5433 -U nexcrm -d nexcrm
# Password: nexcrm_secret

# Find your tenant
SELECT id, name FROM tenants LIMIT 5;
# Copy one tenant_id (e.g., the EduVantage one)
```

### **Step 2: Get Template IDs**

```sql
-- In psql
SELECT id, name, category FROM templates WHERE tenant_id = 'PASTE-TENANT-ID-HERE' LIMIT 5;
-- Copy two template IDs
```

### **Step 3: Get a Lead ID**

```sql
-- Get a lead from same tenant
SELECT id, first_name, last_name, email FROM leads WHERE tenant_id = 'PASTE-TENANT-ID-HERE' LIMIT 5;
-- Copy one lead_id
```

### **Step 4: Create Test Sequence**

```sql
-- Create a 2-step sequence
INSERT INTO sequences (id, tenant_id, name, trigger_type, steps, status, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'PASTE-TENANT-ID-HERE',
  'Quick Test Sequence',
  'manual',
  '[
    {
      "step_number": 1,
      "action": "email",
      "template_id": "PASTE-FIRST-TEMPLATE-ID",
      "delay_value": 0,
      "delay_unit": "minutes"
    },
    {
      "step_number": 2,
      "action": "email",
      "template_id": "PASTE-SECOND-TEMPLATE-ID",
      "delay_value": 2,
      "delay_unit": "minutes"
    }
  ]'::jsonb,
  'active',
  (SELECT id FROM users WHERE tenant_id = 'PASTE-TENANT-ID-HERE' LIMIT 1),
  NOW(),
  NOW()
) RETURNING id;

-- Copy the returned sequence ID
```

### **Step 5: Enroll Lead**

```sql
-- Enroll the lead
INSERT INTO sequence_enrollments (id, tenant_id, lead_id, sequence_id, current_step, started_at, next_step_at, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'PASTE-TENANT-ID-HERE',
  'PASTE-LEAD-ID-HERE',
  'PASTE-SEQUENCE-ID-HERE',
  0,
  NOW(),
  NOW(),  -- Execute immediately
  'active',
  NOW(),
  NOW()
) RETURNING id, next_step_at;
```

### **Step 6: Watch it Work!**

```bash
# In another terminal, watch the backend logs
cd /home/dhawal/NextgEN/NEXCRM/backend
npm run dev

# You'll see in 2 minutes (at next cron run):
[CRON] 🔄 Processing sequence steps...
[SequenceService] Found 1 pending enrollments
[OutreachService] Sending email to ...
✅ Email sent successfully

# 2 minutes later:
[CRON] 🔄 Processing sequence steps...
[SequenceService] Found 1 pending enrollments
[OutreachService] Sending email to ...
✅ Sequence completed!
```

### **Step 7: Check Database**

```sql
-- See the enrollment progress
SELECT 
  id,
  current_step,
  status,
  next_step_at,
  created_at
FROM sequence_enrollments
WHERE sequence_id = 'PASTE-SEQUENCE-ID-HERE';

-- See emails sent
SELECT 
  id,
  subject_line,
  sent_at,
  status,
  opened_at
FROM outreach_records
WHERE lead_id = 'PASTE-LEAD-ID-HERE'
ORDER BY created_at DESC;
```

---

## 🌐 **METHOD 2: Test via API (More Realistic)**

### **Step 1: Login to Get Token**

```bash
# Login as tenant admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@eduvantage.com",
    "password": "admin123"
  }'

# Save the accessToken from response
```

### **Step 2: Create Templates**

```bash
# Template 1
curl -X POST http://localhost:5000/api/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR-ACCESS-TOKEN" \
  -d '{
    "name": "Test Email Step 1",
    "category": "test",
    "subject": "Hello {{lead.first_name}}! (Step 1)",
    "body": "<h1>This is Step 1</h1><p>You should receive Step 2 in 2 minutes</p>",
    "is_active": true
  }'

# Save template ID from response

# Template 2
curl -X POST http://localhost:5000/api/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR-ACCESS-TOKEN" \
  -d '{
    "name": "Test Email Step 2",
    "category": "test",
    "subject": "Following up {{lead.first_name}}! (Step 2)",
    "body": "<h1>This is Step 2</h1><p>Sequence complete!</p>",
    "is_active": true
  }'

# Save template ID from response
```

### **Step 3: Get a Lead ID**

```bash
curl -X GET "http://localhost:5000/api/leads?limit=5" \
  -H "Authorization: Bearer YOUR-ACCESS-TOKEN"

# Pick a lead ID from the response
```

### **Step 4: Create Sequence**

```bash
curl -X POST http://localhost:5000/api/sequences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR-ACCESS-TOKEN" \
  -d '{
    "name": "API Test Sequence",
    "trigger_type": "manual",
    "status": "active",
    "steps": [
      {
        "step_number": 1,
        "action": "email",
        "template_id": "PASTE-TEMPLATE-1-ID",
        "delay_value": 0,
        "delay_unit": "minutes"
      },
      {
        "step_number": 2,
        "action": "email",
        "template_id": "PASTE-TEMPLATE-2-ID",
        "delay_value": 2,
        "delay_unit": "minutes"
      }
    ]
  }'

# Save sequence ID from response
```

### **Step 5: Enroll Lead**

```bash
curl -X POST http://localhost:5000/api/sequences/enroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR-ACCESS-TOKEN" \
  -d '{
    "lead_id": "PASTE-LEAD-ID",
    "sequence_id": "PASTE-SEQUENCE-ID"
  }'
```

### **Step 6: Monitor Progress**

```bash
# Check enrollments
curl -X GET "http://localhost:5000/api/sequences/enrollments" \
  -H "Authorization: Bearer YOUR-ACCESS-TOKEN"

# Check outreach history
curl -X GET "http://localhost:5000/api/outreach/history" \
  -H "Authorization: Bearer YOUR-ACCESS-TOKEN"
```

---

## 🔍 **METHOD 3: Monitor in Real-Time**

### **Terminal 1: Backend Logs**

```bash
cd /home/dhawal/NextgEN/NEXCRM/backend
npm run dev

# Watch for cron messages every 2 minutes:
# [CRON] 🔄 Processing sequence steps...
```

### **Terminal 2: Database Watch**

```bash
# Watch enrollments change in real-time
watch -n 5 'psql -h localhost -p 5433 -U nexcrm -d nexcrm -c "SELECT id, current_step, status, next_step_at FROM sequence_enrollments WHERE status = '"'"'active'"'"' ORDER BY next_step_at LIMIT 10;"'
```

### **Terminal 3: Email Count**

```bash
# Watch emails being sent
watch -n 5 'psql -h localhost -p 5433 -U nexcrm -d nexcrm -c "SELECT COUNT(*) as emails_sent_last_5min FROM outreach_records WHERE sent_at > NOW() - INTERVAL '"'"'5 minutes'"'"';"'
```

---

## 📊 **Verify Cron is Running**

```bash
# Check backend logs for cron initialization
cd /home/dhawal/NextgEN/NEXCRM/backend
npm run dev 2>&1 | grep -A 10 "AUTOMATED EMAIL SYSTEM"

# You should see:
╔════════════════════════════════════════════════════════╗
║     🤖 AUTOMATED EMAIL SYSTEM INITIALIZED             ║
║              ⚠️  TESTING MODE ACTIVE                  ║
╚════════════════════════════════════════════════════════╝

🔄 MULTI-STEP SEQUENCES:
  • Step processor: Every 2 minutes ⚡ (TESTING)
  • Auto-enrollment: Every 5 minutes ⚡ (TESTING)
```

---

## 🐛 **Troubleshooting**

### **Problem: "No emails being sent"**

```bash
# 1. Check for pending enrollments
psql -h localhost -p 5433 -U nexcrm -d nexcrm -c "SELECT * FROM sequence_enrollments WHERE status = 'active' AND next_step_at <= NOW();"

# 2. Check if cron is running
# Look at backend console - should see "[CRON]" messages every 2 minutes

# 3. Check sequence is active
psql -h localhost -p 5433 -U nexcrm -d nexcrm -c "SELECT id, name, status FROM sequences;"

# 4. Check global pause
psql -h localhost -p 5433 -U nexcrm -d nexcrm -c "SELECT tenant_id, global_pause FROM nurturing_settings;"
```

### **Problem: "Invalid template_id"**

```bash
# Make sure template belongs to same tenant as sequence
psql -h localhost -p 5433 -U nexcrm -d nexcrm -c "
SELECT 
  s.id as sequence_id,
  s.tenant_id as seq_tenant,
  t.id as template_id,
  t.tenant_id as tmpl_tenant
FROM sequences s
CROSS JOIN LATERAL jsonb_array_elements(s.steps) step
JOIN templates t ON t.id = (step->>'template_id')::uuid
WHERE s.id = 'YOUR-SEQUENCE-ID';
"
```

### **Problem: "Enrollment stuck"**

```bash
# Check next_step_at time
psql -h localhost -p 5433 -U nexcrm -d nexcrm -c "
SELECT 
  id,
  current_step,
  next_step_at,
  NOW() as current_time,
  next_step_at <= NOW() as is_due
FROM sequence_enrollments
WHERE id = 'YOUR-ENROLLMENT-ID';
"

# If is_due = true but not processed, check logs for errors
```

---

## ✅ **Expected Timeline (2-Minute Test)**

```
00:00 - Create sequence and enroll lead
        current_step = 0
        next_step_at = now()

00:02 - Cron runs (first time)
        ├─ Finds enrollment
        ├─ Sends Email #1 (Step 1)
        └─ Updates: current_step = 1, next_step_at = 00:04

00:04 - Cron runs (second time)
        ├─ Finds enrollment
        ├─ Sends Email #2 (Step 2)
        └─ Updates: current_step = 2, status = 'completed'

00:06 - Cron runs (third time)
        └─ No pending enrollments (test complete!)
```

---

## 📧 **Check Your Email**

If you used your email as the lead:
- Check your inbox for 2 emails
- First email arrives within 2 minutes of enrollment
- Second email arrives 2 minutes after first

**Gmail SMTP Config:**
- From: `Pritomatic <info@pritomatic.in>`
- Tracking pixels included
- Click tracking enabled
- Unsubscribe link at bottom

---

## 🎯 **Quick Copy-Paste Test (Using Seed Data)**

Assuming you have seed data, here's a one-command test:

```bash
# Execute this in psql
psql -h localhost -p 5433 -U nexcrm -d nexcrm << 'EOF'

-- Get IDs from seed data
\set tenant_id (SELECT id FROM tenants WHERE name = 'EduVantage Institute' LIMIT 1)
\set template1_id (SELECT id FROM templates WHERE tenant_id = :'tenant_id' AND category = 'welcome' LIMIT 1)
\set template2_id (SELECT id FROM templates WHERE tenant_id = :'tenant_id' AND category = 'follow_up' LIMIT 1)
\set lead_id (SELECT id FROM leads WHERE tenant_id = :'tenant_id' LIMIT 1)
\set user_id (SELECT id FROM users WHERE tenant_id = :'tenant_id' LIMIT 1)

-- Create test sequence
INSERT INTO sequences (id, tenant_id, name, trigger_type, steps, status, created_by)
VALUES (
  gen_random_uuid(),
  :'tenant_id',
  'Auto Test Sequence',
  'manual',
  jsonb_build_array(
    jsonb_build_object(
      'step_number', 1,
      'action', 'email',
      'template_id', :'template1_id',
      'delay_value', 0,
      'delay_unit', 'minutes'
    ),
    jsonb_build_object(
      'step_number', 2,
      'action', 'email',
      'template_id', :'template2_id',
      'delay_value', 2,
      'delay_unit', 'minutes'
    )
  ),
  'active',
  :'user_id'
) RETURNING id \gset sequence_

-- Enroll lead
INSERT INTO sequence_enrollments (tenant_id, lead_id, sequence_id, current_step, started_at, next_step_at, status)
VALUES (
  :'tenant_id',
  :'lead_id',
  :'sequence_id',
  0,
  NOW(),
  NOW(),
  'active'
);

-- Show what was created
SELECT 'Test sequence created!' as message;
SELECT 'Sequence ID: ' || :'sequence_id' as info;
SELECT 'Wait 2-4 minutes and check backend logs for email sending!' as next_step;

EOF
```

---

## 🎉 **Success Indicators**

You'll know it's working when you see:

**✅ In Backend Logs:**
```
[CRON] 🔄 Processing sequence steps...
[SequenceService] Found 1 pending enrollments
[OutreachService] Sending email to leads_edu@example.com
✅ Email sent successfully
```

**✅ In Database:**
```sql
SELECT status, sent_at FROM outreach_records ORDER BY created_at DESC LIMIT 2;
-- Shows 'sent' status with timestamps
```

**✅ In Your Inbox:**
- Email from `Pritomatic <info@pritomatic.in>`
- Subject matches your template
- Content includes lead's name (variables replaced)

---

**Need help? Check the logs and database queries above!** 🚀
