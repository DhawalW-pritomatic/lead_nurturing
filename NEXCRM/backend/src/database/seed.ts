import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database';
import { Tenant, User, Lead, ApplicationType, Template, Sequence, RoutingRule, ScoringProfile, NurturingSettings, AssetProject, AssetFolder, EngagementEvent, OutreachRecord } from '../database/models';

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');
    await sequelize.sync({ force: true });
    console.log('Tables recreated.');

    const passwordHash = await bcrypt.hash('Admin@123', 12);
    const repPassword = await bcrypt.hash('Rep@123', 12);

    // Create Tenants
    const tenants = await Tenant.bulkCreate([
      { id: uuidv4(), name: 'EduVantage Institute', subdomain: 'edu', vertical_type: 'education', plan_tier: 'enterprise', branding: { primary_color: '#4F46E5', logo: '/logo-edu.png' } },
      { id: uuidv4(), name: 'Prime Realty Group', subdomain: 'realestate', vertical_type: 'real_estate', plan_tier: 'enterprise', branding: { primary_color: '#059669', logo: '/logo-re.png' } },
      { id: uuidv4(), name: 'BuildCraft Construction', subdomain: 'construction', vertical_type: 'construction', plan_tier: 'standard', branding: { primary_color: '#D97706', logo: '/logo-const.png' } },
      { id: uuidv4(), name: 'TechNova IT Solutions', subdomain: 'itservices', vertical_type: 'it_services', plan_tier: 'enterprise', branding: { primary_color: '#7C3AED', logo: '/logo-it.png' } },
      { id: uuidv4(), name: 'AutoParts Express', subdomain: 'autoparts', vertical_type: 'auto_parts', plan_tier: 'standard', branding: { primary_color: '#DC2626', logo: '/logo-auto.png' } },
      { id: uuidv4(), name: 'CleanAir IoT', subdomain: 'iotaqi', vertical_type: 'iot_aqi', plan_tier: 'enterprise', branding: { primary_color: '#0891B2', logo: '/logo-iot.png' } },
    ]);

    console.log(`Created ${tenants.length} tenants.`);

    // Create Users for each tenant
    const users: any[] = [];
    for (const tenant of tenants) {
      const tenantUsers = [
        { tenant_id: tenant.id, email: `admin@${tenant.subdomain}.nexcrm.io`, password_hash: passwordHash, first_name: 'Admin', last_name: tenant.name.split(' ')[0], role: 'tenant_admin', phone: '+91-9876543210', rep_tags: [] },
        { tenant_id: tenant.id, email: `manager@${tenant.subdomain}.nexcrm.io`, password_hash: repPassword, first_name: 'Sales', last_name: 'Manager', role: 'sales_manager', phone: '+91-9876543211', rep_tags: [] },
        { tenant_id: tenant.id, email: `senior@${tenant.subdomain}.nexcrm.io`, password_hash: repPassword, first_name: 'Senior', last_name: 'Rep', role: 'senior_sales_rep', phone: '+91-9876543212', rep_tags: ['enterprise', 'luxury'] },
        { tenant_id: tenant.id, email: `rep1@${tenant.subdomain}.nexcrm.io`, password_hash: repPassword, first_name: 'Rahul', last_name: 'Sharma', role: 'sales_rep', phone: '+91-9876543213', territory: 'Mumbai', rep_tags: ['retail'] },
        { tenant_id: tenant.id, email: `rep2@${tenant.subdomain}.nexcrm.io`, password_hash: repPassword, first_name: 'Priya', last_name: 'Patel', role: 'sales_rep', phone: '+91-9876543214', territory: 'Delhi', rep_tags: ['online'] },
        { tenant_id: tenant.id, email: `rep3@${tenant.subdomain}.nexcrm.io`, password_hash: repPassword, first_name: 'Amit', last_name: 'Kumar', role: 'sales_rep', phone: '+91-9876543215', territory: 'Bangalore', rep_tags: ['b2b'] },
      ];
      const created = await User.bulkCreate(tenantUsers);
      users.push(...created);
    }

    // Create Super Admin
    await User.create({
      tenant_id: tenants[0].id,
      email: 'superadmin@nexcrm.io',
      password_hash: passwordHash,
      first_name: 'Super',
      last_name: 'Admin',
      role: 'super_admin',
      phone: '+91-9000000000',
      rep_tags: [],
      mfa_enabled: true,
    });

    console.log(`Created ${users.length + 1} users.`);

    // Application Types per tenant
    const appTypeConfigs: Record<string, string[]> = {
      education: ['Undergraduate Admission', 'Postgraduate Admission', 'Certificate Program', 'Online Course', 'Coaching / Test Prep'],
      real_estate: ['Residential Plot', '2BHK Apartment', '3BHK Apartment', 'Villa', 'Commercial Space'],
      construction: ['Residential Construction', 'Commercial Build', 'Renovation/Fitout', 'Interior Design', 'Project Consultation'],
      it_services: ['Custom Software Development', 'Mobile App', 'Website / Portal', 'IT Consulting', 'Cloud Migration'],
      auto_parts: ['Retail Walk-in', 'Online Order', 'Bulk B2B Order', 'OEM Partnership', 'Workshop Supply'],
      iot_aqi: ['Individual Residential', 'Institutional (School)', 'Industrial Monitoring', 'B2B Bulk Order', 'API Data Service'],
    };

    const appTypes: any[] = [];
    for (const tenant of tenants) {
      const types = appTypeConfigs[tenant.vertical_type] || [];
      for (const typeName of types) {
        appTypes.push({ tenant_id: tenant.id, name: typeName, vertical: tenant.vertical_type });
      }
    }
    const createdAppTypes = await ApplicationType.bulkCreate(appTypes);
    console.log(`Created ${createdAppTypes.length} application types.`);

    // Create Leads (50 per tenant = 300 total)
    const leadSources = ['Field Visit', 'Cold Call', 'Referral', 'Event/Expo', 'Website', 'Ad Campaign', 'CSV Import'];
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];
    const firstNames = ['Arjun', 'Vikram', 'Sneha', 'Pooja', 'Rohan', 'Ananya', 'Karan', 'Meera', 'Aditya', 'Kavya', 'Nikhil', 'Isha', 'Ravi', 'Anjali', 'Siddharth', 'Nisha', 'Deepak', 'Swati', 'Manish', 'Divya'];
    const lastNames = ['Verma', 'Gupta', 'Singh', 'Joshi', 'Nair', 'Reddy', 'Mehta', 'Iyer', 'Malhotra', 'Bhat', 'Mishra', 'Shetty', 'Rao', 'Desai', 'Kulkarni', 'Pandey', 'Shah', 'Chopra', 'Agarwal', 'Menon'];
    const companies = ['TCS', 'Infosys', 'Wipro', 'HCL', 'MindTree', 'Zoho', 'Freshworks', 'Razorpay', 'BYJU\'s', 'Flipkart', 'Swiggy', 'Zomato', 'PhonePe', 'CRED', 'Unacademy'];
    const statuses = ['NEW', 'ACTIVE', 'ENGAGED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONVERTED', 'LOST', 'STALE'];
    const leadTypes = ['COLD', 'WARM', 'HOT', 'STALE', 'CONVERTED', 'LOST'];

    const allLeads: any[] = [];
    for (const tenant of tenants) {
      const tenantAppTypes = createdAppTypes.filter((at: any) => at.tenant_id === tenant.id);
      const tenantUsers1 = users.filter((u: any) => u.tenant_id === tenant.id);
      const reps = tenantUsers1.filter((u: any) => ['sales_rep', 'senior_sales_rep'].includes(u.role));

      for (let i = 0; i < 50; i++) {
        const score = Math.floor(Math.random() * 150);
        let leadType: string;
        if (score >= 80) leadType = 'HOT';
        else if (score >= 40) leadType = 'WARM';
        else leadType = 'COLD';

        // Some converted/lost/stale
        if (i % 12 === 0) leadType = 'CONVERTED';
        if (i % 15 === 0) leadType = 'LOST';
        if (i % 20 === 0) leadType = 'STALE';

        let status: string;
        switch (leadType) {
          case 'HOT': status = ['ENGAGED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION'][Math.floor(Math.random() * 4)]; break;
          case 'WARM': status = ['ACTIVE', 'ENGAGED'][Math.floor(Math.random() * 2)]; break;
          case 'CONVERTED': status = 'CONVERTED'; break;
          case 'LOST': status = 'LOST'; break;
          case 'STALE': status = 'STALE'; break;
          default: status = ['NEW', 'ACTIVE'][Math.floor(Math.random() * 2)];
        }

        const daysAgo = Math.floor(Math.random() * 90);
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        allLeads.push({
          tenant_id: tenant.id,
          first_name: firstNames[Math.floor(Math.random() * firstNames.length)],
          last_name: lastNames[Math.floor(Math.random() * lastNames.length)],
          email: `lead${i}_${tenant.subdomain}@example.com`,
          phone: `+91-${9000000000 + Math.floor(Math.random() * 999999999)}`,
          company: companies[Math.floor(Math.random() * companies.length)],
          city: cities[Math.floor(Math.random() * cities.length)],
          source: leadSources[Math.floor(Math.random() * leadSources.length)],
          application_type_id: tenantAppTypes[Math.floor(Math.random() * tenantAppTypes.length)]?.id,
          status,
          lead_type: leadType,
          score,
          assigned_rep_id: reps[Math.floor(Math.random() * reps.length)]?.id,
          enrolled_by: tenantUsers1[0]?.id,
          gdpr_consent: true,
          notes: `Lead #${i + 1} for ${tenant.name}`,
          custom_fields: {},
          last_activity_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          created_at: createdAt,
        });
      }
    }
    await Lead.bulkCreate(allLeads);
    console.log(`Created ${allLeads.length} leads.`);

    // Create Templates for each tenant
    const templateConfigs = [
      { name: 'Welcome Email', category: 'welcome', subject: 'Welcome to {{company.name}}!', body: '<h2>Hello {{lead.first_name}}!</h2><p>Thank you for your interest in {{company.name}}. We are thrilled to have you here.</p><p>Your dedicated representative, {{rep.name}}, will be reaching out shortly to understand your needs better.</p><p>In the meantime, feel free to explore our offerings at the link below:</p><p><a href="{{tracking.cta_url}}">Explore Now →</a></p><p>Best regards,<br/>{{rep.name}}<br/>{{company.name}}</p>' },
      { name: 'Onboarding Guide', category: 'onboarding', subject: 'Getting Started with {{company.name}}', body: '<h2>Hi {{lead.first_name}},</h2><p>Welcome aboard! Here\'s a quick guide to help you get started:</p><ol><li>Review our product catalog</li><li>Schedule a demo call with {{rep.name}}</li><li>Set up your account preferences</li></ol><p><a href="{{tracking.cta_url}}">View Onboarding Guide →</a></p><p>Need help? Reach out to {{rep.name}} at {{rep.email}}</p>' },
      { name: 'Exclusive Discount Offer', category: 'discount', subject: '🎉 Special Offer Just for You, {{lead.first_name}}!', body: '<h2>Hi {{lead.first_name}},</h2><p>We have an exclusive offer waiting for you!</p><p>As a valued prospect of {{company.name}}, we\'d like to offer you a <strong>15% discount</strong> on your first purchase.</p><p>This offer expires in 7 days.</p><p><a href="{{tracking.cta_url}}">Claim Your Discount →</a></p><p>Don\'t miss out!<br/>{{rep.name}}</p>' },
      { name: 'Post-Purchase Thank You', category: 'post_purchase', subject: 'Thank You for Choosing {{company.name}}!', body: '<h2>Congratulations, {{lead.first_name}}! 🎉</h2><p>Your purchase is confirmed. We\'re so grateful you chose {{company.name}}.</p><p>Here\'s what happens next:</p><ul><li>You\'ll receive your order confirmation within 24 hours</li><li>Our team will reach out for onboarding support</li><li>Access your dashboard for updates</li></ul><p>Have questions? Contact {{rep.name}} at {{rep.email}}</p><p>Welcome to the family!<br/>Team {{company.name}}</p>' },
      { name: 'Follow-Up Nudge', category: 'follow_up', subject: 'Quick Check-in — {{company.name}}', body: '<h2>Hi {{lead.first_name}},</h2><p>Just checking in! Did you get a chance to review our brochure?</p><p>I\'d love to schedule a quick 15-minute call to discuss how {{company.name}} can help {{lead.company}}.</p><p><a href="{{tracking.cta_url}}">Book a Call →</a></p><p>Looking forward to hearing from you!<br/>{{rep.name}}</p>' },
      { name: 'Re-engagement Email', category: 'reengagement', subject: 'We Miss You, {{lead.first_name}}!', body: '<h2>Hey {{lead.first_name}},</h2><p>It\'s been a while since we last connected. We\'ve been making great improvements and have some exciting updates to share.</p><p>Would you like to reconnect? Here\'s what\'s new:</p><ul><li>New features and products</li><li>Special returning customer benefits</li><li>Updated pricing plans</li></ul><p><a href="{{tracking.cta_url}}">See What\'s New →</a></p><p>We\'d love to have you back!</p>' },
    ];

    for (const tenant of tenants) {
      const adminUser = users.find((u: any) => u.tenant_id === tenant.id && u.role === 'tenant_admin');
      for (const tc of templateConfigs) {
        await Template.create({
          tenant_id: tenant.id,
          name: tc.name,
          channel: 'email',
          subject: tc.subject,
          body: tc.body,
          variables: ['lead.first_name', 'lead.last_name', 'lead.company', 'rep.name', 'rep.email', 'company.name', 'tracking.cta_url'],
          category: tc.category,
          is_active: true,
          created_by: adminUser?.id,
        });
      }
    }
    console.log('Created templates for all tenants.');

    // Create Sequences
    for (const tenant of tenants) {
      const adminUser = users.find((u: any) => u.tenant_id === tenant.id && u.role === 'tenant_admin');
      await Sequence.bulkCreate([
        {
          tenant_id: tenant.id, name: 'Cold Lead Nurture', trigger_type: 'enrollment', lead_type_target: 'COLD', status: 'active', created_by: adminUser?.id,
          steps: [
            { day: 0, channel: 'email', template_category: 'welcome', notes: 'Welcome email with brochure' },
            { day: 2, channel: 'email', template_category: 'follow_up', notes: 'Follow-up check-in' },
            { day: 5, channel: 'email', template_category: 'onboarding', notes: 'Value proposition email' },
            { day: 10, channel: 'email', template_category: 'discount', notes: 'Special offer' },
            { day: 14, channel: 'email', template_category: 'follow_up', notes: 'Final nudge' },
            { day: 21, channel: 'email', template_category: 'reengagement', notes: 'Re-engagement attempt' },
          ],
        },
        {
          tenant_id: tenant.id, name: 'Warm Lead Engagement', trigger_type: 'score_change', lead_type_target: 'WARM', status: 'active', created_by: adminUser?.id,
          steps: [
            { day: 0, channel: 'email', template_category: 'onboarding', notes: 'Accelerated engagement' },
            { day: 2, channel: 'email', template_category: 'discount', notes: 'Conversion offer' },
            { day: 5, channel: 'email', template_category: 'follow_up', notes: 'Schedule meeting' },
          ],
        },
        {
          tenant_id: tenant.id, name: 'Post-Purchase Sequence', trigger_type: 'conversion', lead_type_target: 'CONVERTED', status: 'active', created_by: adminUser?.id,
          steps: [
            { day: 0, channel: 'email', template_category: 'post_purchase', notes: 'Thank you' },
            { day: 3, channel: 'email', template_category: 'onboarding', notes: 'Getting started' },
            { day: 7, channel: 'email', template_category: 'discount', notes: 'Cross-sell accessories' },
            { day: 14, channel: 'email', template_category: 'follow_up', notes: 'Check-in & feedback request' },
            { day: 30, channel: 'email', template_category: 'discount', notes: 'Referral program' },
          ],
        },
        {
          tenant_id: tenant.id, name: 'Stale Lead Re-engagement', trigger_type: 'stale', lead_type_target: 'STALE', status: 'active', created_by: adminUser?.id,
          steps: [
            { day: 0, channel: 'email', template_category: 'reengagement', notes: 'We miss you' },
            { day: 7, channel: 'email', template_category: 'discount', notes: 'Special comeback offer' },
            { day: 14, channel: 'email', template_category: 'follow_up', notes: 'Final reach-out' },
          ],
        },
      ]);
    }
    console.log('Created sequences for all tenants.');

    // Routing Rules
    for (const tenant of tenants) {
      await RoutingRule.bulkCreate([
        { tenant_id: tenant.id, name: 'Hot Lead Escalation', condition_expression: { operator: 'OR', conditions: [{ field: 'score', op: '>=', value: 80 }, { field: 'cta_clicks_48h', op: '>=', value: 3 }] }, action_config: { action: 'assign_senior_rep', sequence: 'hot_escalation', notify_manager: true }, priority: 1 },
        { tenant_id: tenant.id, name: 'Warm Lead SDR Assignment', condition_expression: { operator: 'AND', conditions: [{ field: 'score', op: '>=', value: 40 }, { field: 'score', op: '<', value: 80 }] }, action_config: { action: 'assign_round_robin', pool: 'sdr', sequence: 'warm_engagement' }, priority: 2 },
        { tenant_id: tenant.id, name: 'Cold Lead Nurture', condition_expression: { operator: 'AND', conditions: [{ field: 'score', op: '<', value: 40 }] }, action_config: { action: 'enroll_sequence', sequence: 'cold_nurture', no_rep_assign: true }, priority: 3 },
        { tenant_id: tenant.id, name: 'Stale Re-engagement', condition_expression: { operator: 'AND', conditions: [{ field: 'days_inactive', op: '>=', value: 30 }] }, action_config: { action: 'mark_stale', sequence: 'stale_reengagement' }, priority: 4 },
      ]);
    }
    console.log('Created routing rules for all tenants.');

    // Scoring Profiles
    for (const tenant of tenants) {
      await ScoringProfile.create({
        tenant_id: tenant.id,
        name: 'Default Scoring Profile',
        event_weights: {
          email_opened: 5, email_cta_clicked: 15, website_visit: 10, website_visit_high_intent: 20,
          asset_downloaded: 20, whatsapp_replied: 20, whatsapp_link_clicked: 15, call_booked: 40,
          form_resubmitted: 25, no_activity_7_days: -10, no_activity_30_days: -30,
        },
        type_thresholds: { cold: { min: 0, max: 39 }, warm: { min: 40, max: 79 }, hot: { min: 80, max: 200 } },
      });
    }
    console.log('Created scoring profiles.');

    // Nurturing Settings
    for (const tenant of tenants) {
      await NurturingSettings.create({ tenant_id: tenant.id });
    }
    console.log('Created nurturing settings.');

    // Asset Projects and Folders
    for (const tenant of tenants) {
      const project = await AssetProject.create({
        tenant_id: tenant.id,
        name: `${tenant.name} Assets`,
        description: `Marketing and sales assets for ${tenant.name}`,
        icon: '📁',
      });
      const folders = ['Brochures', 'Case Studies', 'Discounts', 'Onboarding', 'Post-Purchase', 'Warranty'];
      for (const folderName of folders) {
        await AssetFolder.create({ tenant_id: tenant.id, project_id: project.id, name: folderName });
      }
    }
    console.log('Created asset projects and folders.');

    // Engagement Events (sample data)
    const eventTypes = ['email_opened', 'email_cta_clicked', 'website_visit', 'asset_downloaded', 'website_visit_high_intent'];
    const leads = await Lead.findAll({ limit: 100 });
    const engagementEvents: any[] = [];
    for (const lead of leads) {
      const numEvents = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < numEvents; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        engagementEvents.push({
          tenant_id: lead.tenant_id,
          lead_id: lead.id,
          event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          channel: 'email',
          metadata: {},
          score_delta: [5, 15, 10, 20, 20][Math.floor(Math.random() * 5)],
          created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        });
      }
    }
    await EngagementEvent.bulkCreate(engagementEvents);
    console.log(`Created ${engagementEvents.length} engagement events.`);

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('─'.repeat(50));
    console.log('Super Admin: superadmin@nexcrm.io / Admin@123');
    console.log('─'.repeat(50));
    for (const tenant of tenants) {
      console.log(`\n${tenant.name} (${tenant.subdomain}):`);
      console.log(`  Admin: admin@${tenant.subdomain}.nexcrm.io / Admin@123`);
      console.log(`  Manager: manager@${tenant.subdomain}.nexcrm.io / Rep@123`);
      console.log(`  Reps: rep1@${tenant.subdomain}.nexcrm.io / Rep@123`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
