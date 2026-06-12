import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { Lead, EngagementEvent, OutreachRecord, User, SequenceEnrollment, LeadQuery, RepAvailability } from '../../../database/models';
import { Op } from 'sequelize';
import sequelize from '../../../config/database';

export class DashboardController {
  async getOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenant_id;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalLeads, newThisWeek, newThisMonth,
        hotLeads, warmLeads, coldLeads, staleLeads, convertedLeads,
        totalOutreach, outreachThisWeek,
        activeSequences,
        totalQueries, pendingQueries, answeredQueries, queriesThisWeek,
      ] = await Promise.all([
        Lead.count({ where: { tenant_id: tenantId } }),
        Lead.count({ where: { tenant_id: tenantId, created_at: { [Op.gte]: sevenDaysAgo } } }),
        Lead.count({ where: { tenant_id: tenantId, created_at: { [Op.gte]: thirtyDaysAgo } } }),
        Lead.count({ where: { tenant_id: tenantId, lead_type: 'HOT' } }),
        Lead.count({ where: { tenant_id: tenantId, lead_type: 'WARM' } }),
        Lead.count({ where: { tenant_id: tenantId, lead_type: 'COLD' } }),
        Lead.count({ where: { tenant_id: tenantId, lead_type: 'STALE' } }),
        Lead.count({ where: { tenant_id: tenantId, lead_type: 'CONVERTED' } }),
        OutreachRecord.count({ where: { tenant_id: tenantId } }),
        OutreachRecord.count({ where: { tenant_id: tenantId, created_at: { [Op.gte]: sevenDaysAgo } } }),
        SequenceEnrollment.count({ where: { tenant_id: tenantId, status: 'active' } }),
        LeadQuery.count({ where: { tenant_id: tenantId } }),
        LeadQuery.count({ where: { tenant_id: tenantId, status: 'pending' } }),
        LeadQuery.count({ where: { tenant_id: tenantId, status: 'answered' } }),
        LeadQuery.count({ where: { tenant_id: tenantId, created_at: { [Op.gte]: sevenDaysAgo } } }),
      ]);

      const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';

      res.json({
        total_leads: totalLeads,
        new_this_week: newThisWeek,
        new_this_month: newThisMonth,
        lead_types: { hot: hotLeads, warm: warmLeads, cold: coldLeads, stale: staleLeads, converted: convertedLeads },
        conversion_rate: conversionRate,
        total_outreach: totalOutreach,
        outreach_this_week: outreachThisWeek,
        active_sequences: activeSequences,
        total_queries: totalQueries,
        pending_queries: pendingQueries,
        answered_queries: answeredQueries,
        queries_this_week: queriesThisWeek,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getLeadFunnel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenant_id;
      const funnel = await Lead.findAll({
        where: { tenant_id: tenantId },
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      res.json(funnel);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getLeadTrends(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenant_id;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const trends = await Lead.findAll({
        where: { tenant_id: tenantId, created_at: { [Op.gte]: thirtyDaysAgo } },
        attributes: [
          [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: [sequelize.fn('DATE', sequelize.col('created_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
        raw: true,
      });
      res.json(trends);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSourceAttribution(req: AuthRequest, res: Response): Promise<void> {
    try {
      const sources = await Lead.findAll({
        where: { tenant_id: req.user!.tenant_id },
        attributes: ['source', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['source'],
        raw: true,
      });
      res.json(sources);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getOutreachStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenant_id;
      const stats = await OutreachRecord.findAll({
        where: { tenant_id: tenantId },
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getEngagementActivity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenant_id;
      const recentEvents = await EngagementEvent.findAll({
        where: { tenant_id: tenantId },
        include: [{ model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email'] }],
        order: [['created_at', 'DESC']],
        limit: 50,
      });
      res.json(recentEvents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getScoreDistribution(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenant_id;
      const distribution = await Lead.findAll({
        where: { tenant_id: tenantId },
        attributes: [
          [sequelize.literal(`CASE 
            WHEN score BETWEEN 0 AND 20 THEN '0-20'
            WHEN score BETWEEN 21 AND 40 THEN '21-40'
            WHEN score BETWEEN 41 AND 60 THEN '41-60'
            WHEN score BETWEEN 61 AND 80 THEN '61-80'
            WHEN score BETWEEN 81 AND 100 THEN '81-100'
            WHEN score > 100 THEN '100+'
          END`), 'range'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: [sequelize.literal(`CASE 
          WHEN score BETWEEN 0 AND 20 THEN '0-20'
          WHEN score BETWEEN 21 AND 40 THEN '21-40'
          WHEN score BETWEEN 41 AND 60 THEN '41-60'
          WHEN score BETWEEN 61 AND 80 THEN '61-80'
          WHEN score BETWEEN 81 AND 100 THEN '81-100'
          WHEN score > 100 THEN '100+'
        END`)],
        raw: true,
      });
      res.json(distribution);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRepLeaderboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenant_id;
      const reps = await User.findAll({
        where: { tenant_id: tenantId, role: { [Op.in]: ['sales_rep', 'senior_sales_rep'] }, is_active: true },
        attributes: ['id', 'first_name', 'last_name', 'email'],
      });

      const leaderboard = await Promise.all(
        reps.map(async (rep: any) => {
          const [total, converted, hot] = await Promise.all([
            Lead.count({ where: { assigned_rep_id: rep.id, tenant_id: tenantId } }),
            Lead.count({ where: { assigned_rep_id: rep.id, tenant_id: tenantId, lead_type: 'CONVERTED' } }),
            Lead.count({ where: { assigned_rep_id: rep.id, tenant_id: tenantId, lead_type: 'HOT' } }),
          ]);
          return { id: rep.id, name: `${rep.first_name} ${rep.last_name}`, total, converted, hot, conversion_rate: total > 0 ? ((converted / total) * 100).toFixed(1) : '0' };
        })
      );

      res.json(leaderboard.sort((a, b) => b.converted - a.converted));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRepDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenant_id;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [total, hot, warm, cold, converted, stale, todaysOutreach] = await Promise.all([
        Lead.count({ where: { assigned_rep_id: userId, tenant_id: tenantId } }),
        Lead.count({ where: { assigned_rep_id: userId, tenant_id: tenantId, lead_type: 'HOT' } }),
        Lead.count({ where: { assigned_rep_id: userId, tenant_id: tenantId, lead_type: 'WARM' } }),
        Lead.count({ where: { assigned_rep_id: userId, tenant_id: tenantId, lead_type: 'COLD' } }),
        Lead.count({ where: { assigned_rep_id: userId, tenant_id: tenantId, lead_type: 'CONVERTED' } }),
        Lead.count({ where: { assigned_rep_id: userId, tenant_id: tenantId, lead_type: 'STALE' } }),
        OutreachRecord.count({ where: { tenant_id: tenantId, rep_id: userId, created_at: { [Op.gte]: todayStart } } }),
      ]);

      const hotLeads = await Lead.findAll({
        where: { assigned_rep_id: userId, tenant_id: tenantId, lead_type: 'HOT' },
        order: [['score', 'DESC']],
        limit: 6,
      });

      const recentActivity = await EngagementEvent.findAll({
        include: [{
          model: Lead,
          as: 'lead',
          where: { assigned_rep_id: userId, tenant_id: tenantId },
          attributes: ['id', 'first_name', 'last_name'],
        }],
        order: [['created_at', 'DESC']],
        limit: 10,
      });

      const pipeline = await Lead.findAll({
        where: { assigned_rep_id: userId, tenant_id: tenantId },
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });

      res.json({
        stats: { total, hot, warm, cold, converted, stale, todays_outreach: todaysOutreach },
        hot_leads: hotLeads,
        recent_activity: recentActivity,
        pipeline,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTodayAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const record = await RepAvailability.findOne({
        where: { user_id: req.user!.id, date: today, tenant_id: req.user!.tenant_id },
      });
      res.json(record || { status: 'available', date: today, id: null });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async setTodayAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { status, notes } = req.body;

      const existing = await RepAvailability.findOne({
        where: { user_id: req.user!.id, date: today, tenant_id: req.user!.tenant_id },
      });

      let record;
      if (existing) {
        await existing.update({ status, notes: notes || null });
        record = existing;
      } else {
        record = await RepAvailability.create({
          tenant_id: req.user!.tenant_id,
          user_id: req.user!.id,
          date: today,
          status,
          notes: notes || undefined,
        });
      }

      res.json(record);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
