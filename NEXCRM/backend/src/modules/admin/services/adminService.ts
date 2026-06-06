import { Tenant, User, Lead, OutreachRecord, EngagementEvent, NurturingSettings, ScoringProfile } from '../../../database/models';
import { AppError } from '../../../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import sequelize from '../../../config/database';

export class AdminService {
  async getPlatformAnalytics(): Promise<any> {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalLeads,
      totalOutreach,
      totalEvents,
    ] = await Promise.all([
      Tenant.count(),
      Tenant.count({ where: { is_active: true } }),
      User.count(),
      Lead.count(),
      OutreachRecord.count(),
      EngagementEvent.count(),
    ]);

    // Get tenant breakdown
    const tenantStats = await Tenant.findAll({
      attributes: [
        'id',
        'name',
        'vertical_type',
        'plan_tier',
        'is_active',
        'created_at',
      ],
      include: [
        {
          model: User,
          as: 'users',
          attributes: [],
        },
        {
          model: Lead,
          as: 'leads',
          attributes: [],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Get user count per tenant
    const userCounts = await User.findAll({
      attributes: [
        'tenant_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'user_count'],
      ],
      group: ['tenant_id'],
      raw: true,
    });

    // Get lead counts per tenant
    const leadCounts = await Lead.findAll({
      attributes: [
        'tenant_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'lead_count'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'CONVERTED' THEN 1 END")), 'converted_count'],
      ],
      group: ['tenant_id'],
      raw: true,
    });

    // Map counts to tenants
    const userCountMap = userCounts.reduce((acc: any, item: any) => {
      acc[item.tenant_id] = parseInt(item.user_count);
      return acc;
    }, {});

    const leadCountMap = leadCounts.reduce((acc: any, item: any) => {
      acc[item.tenant_id] = {
        total: parseInt(item.lead_count),
        converted: parseInt(item.converted_count),
      };
      return acc;
    }, {});

    const enrichedTenants = tenantStats.map((tenant: any) => ({
      ...tenant.toJSON(),
      user_count: userCountMap[tenant.id] || 0,
      lead_count: leadCountMap[tenant.id]?.total || 0,
      converted_count: leadCountMap[tenant.id]?.converted || 0,
    }));

    // Recent activity
    const recentActivity = await EngagementEvent.findAll({
      limit: 15,
      order: [['created_at', 'DESC']],
      include: [
        { model: Lead, as: 'lead', attributes: ['first_name', 'last_name', 'email'] },
      ],
    });

    return {
      overview: {
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        total_users: totalUsers,
        total_leads: totalLeads,
        total_outreach: totalOutreach,
        total_events: totalEvents,
      },
      tenants: enrichedTenants,
      recent_activity: recentActivity,
    };
  }

  async getAllTenants(): Promise<any> {
    return await Tenant.findAll({
      order: [['created_at', 'DESC']],
      include: [
        {
          model: NurturingSettings,
          as: 'nurturingSettings',
        },
      ],
    });
  }

  async getTenantById(tenantId: string): Promise<any> {
    const tenant = await Tenant.findByPk(tenantId, {
      include: [
        { model: NurturingSettings, as: 'nurturingSettings' },
        { 
          model: User, 
          as: 'users',
          attributes: { exclude: ['password_hash', 'mfa_secret'] }
        },
      ],
    });

    if (!tenant) {
      throw new AppError('Tenant not found.', 404);
    }

    // Get stats
    const [leadCount, userCount, outreachCount] = await Promise.all([
      Lead.count({ where: { tenant_id: tenantId } }),
      User.count({ where: { tenant_id: tenantId } }),
      OutreachRecord.count({ where: { tenant_id: tenantId } }),
    ]);

    return {
      ...tenant.toJSON(),
      stats: {
        lead_count: leadCount,
        user_count: userCount,
        outreach_count: outreachCount,
      },
    };
  }

  async createTenant(data: any, createdBy: string): Promise<any> {
    // Sanitize subdomain: lowercase, replace spaces with hyphens, remove invalid chars
    const sanitizedSubdomain = data.subdomain
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Create tenant
    const tenant = await Tenant.create({
      name: data.name,
      subdomain: sanitizedSubdomain,
      vertical_type: data.vertical_type || 'general',
      plan_tier: data.plan_tier || 'starter',
      is_active: true,
      settings: data.settings || {},
      branding: data.branding || {},
    });

    // Create default nurturing settings
    await NurturingSettings.create({
      tenant_id: tenant.id,
    });

    // Create default scoring profile
    await ScoringProfile.create({
      tenant_id: tenant.id,
      name: 'Default Profile',
      event_weights: {
        email_opened: 5,
        email_cta_clicked: 15,
        website_visit: 10,
        website_visit_high_intent: 20,
        form_submitted: 25,
      },
      type_thresholds: {
        COLD: 0,
        WARM: 30,
        HOT: 60,
      },
      is_active: true,
    });

    // Create admin user for the tenant
    if (data.admin_email && data.admin_password) {
      const hashedPassword = await bcrypt.hash(data.admin_password, 10);
      await User.create({
        tenant_id: tenant.id,
        email: data.admin_email,
        password_hash: hashedPassword,
        first_name: data.admin_first_name || 'Admin',
        last_name: data.admin_last_name || 'User',
        role: 'tenant_admin',
        is_active: true,
      });
    }

    return tenant;
  }

  async updateTenant(tenantId: string, data: any): Promise<any> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found.', 404);
    }

    await Tenant.update(data, { where: { id: tenantId } });
    return await Tenant.findByPk(tenantId);
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found.', 404);
    }

    // Cascade delete will handle related records
    await Tenant.destroy({ where: { id: tenantId } });
  }

  async toggleTenantStatus(tenantId: string): Promise<any> {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found.', 404);
    }

    await Tenant.update(
      { is_active: !tenant.is_active },
      { where: { id: tenantId } }
    );

    return await Tenant.findByPk(tenantId);
  }

  async getAllUsers(): Promise<any> {
    return await User.findAll({
      attributes: { exclude: ['password_hash', 'mfa_secret'] },
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'vertical_type'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async getTenantUsers(tenantId: string): Promise<any> {
    return await User.findAll({
      where: { tenant_id: tenantId },
      attributes: { exclude: ['password_hash', 'mfa_secret'] },
      order: [['created_at', 'DESC']],
    });
  }

  async getLeadStats(): Promise<any> {
    const stats = await Lead.findAll({
      attributes: [
        'tenant_id',
        'status',
        'lead_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['tenant_id', 'status', 'lead_type'],
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['name'],
        },
      ],
      raw: true,
    });

    return stats;
  }

  async getSystemHealth(): Promise<any> {
    try {
      await sequelize.authenticate();
      
      // Get database size (PostgreSQL specific)
      const [dbSize] = await sequelize.query(
        "SELECT pg_size_pretty(pg_database_size(current_database())) as size;"
      );

      // Get table counts
      const tableCounts = {
        tenants: await Tenant.count(),
        users: await User.count(),
        leads: await Lead.count(),
        outreach_records: await OutreachRecord.count(),
        engagement_events: await EngagementEvent.count(),
      };

      return {
        database: {
          status: 'connected',
          size: (dbSize as any)[0].size,
        },
        tables: tableCounts,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        database: {
          status: 'error',
          error: error.message,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getTenantLeads(tenantId: string, page: number = 1, limit: number = 50): Promise<any> {
    const offset = (page - 1) * limit;

    const { count, rows } = await Lead.findAndCountAll({
      where: { tenant_id: tenantId },
      include: [
        {
          model: User,
          as: 'assignedRep',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      leads: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }
}
