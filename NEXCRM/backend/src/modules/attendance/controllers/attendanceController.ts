import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { RepAvailability, User, Tenant } from '../../../database/models';
import { Op } from 'sequelize';

export class AttendanceController {

  async getDailyAttendance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const role = req.user!.role;
      const tenantId = req.user!.tenant_id;
      const userId = req.user!.id;
      const targetDate = (req.query.date as string) || new Date().toISOString().split('T')[0];

      let userWhere: any = { is_active: true, role: { [Op.ne]: 'super_admin' } };
      let userInclude: any[] = [];

      if (role === 'super_admin') {
        if (req.query.tenant_id) userWhere.tenant_id = req.query.tenant_id;
        userInclude = [{ model: Tenant, as: 'tenant', attributes: ['id', 'name', 'subdomain'] }];
      } else if (role === 'tenant_admin' || role === 'sales_manager') {
        userWhere.tenant_id = tenantId;
      } else {
        userWhere = { id: userId };
      }

      const users = await User.findAll({
        where: userWhere,
        include: userInclude,
        attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'tenant_id'],
        order: [['first_name', 'ASC']],
      });

      const userIds = users.map((u: any) => u.id);
      const records = await RepAvailability.findAll({
        where: { user_id: { [Op.in]: userIds }, date: targetDate },
      });

      const recordMap = new Map(records.map((r: any) => [r.user_id, r]));

      const result = users.map((user: any) => {
        const rec = recordMap.get(user.id);
        return {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role,
            tenant_id: user.tenant_id,
            tenant: user.tenant || null,
          },
          record: rec ? {
            id: rec.id,
            status: rec.status,
            notes: rec.notes,
            checked_in_at: rec.created_at,
          } : null,
        };
      });

      const summary = {
        available:       result.filter((r: any) => r.record?.status === 'available').length,
        half_day_am:     result.filter((r: any) => r.record?.status === 'half_day_am').length,
        half_day_pm:     result.filter((r: any) => r.record?.status === 'half_day_pm').length,
        on_leave:        result.filter((r: any) => r.record?.status === 'on_leave').length,
        not_checked_in:  result.filter((r: any) => !r.record).length,
        total:           result.length,
      };

      res.json({ date: targetDate, records: result, summary });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAttendanceHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const role = req.user!.role;
      const tenantId = req.user!.tenant_id;
      const userId = req.user!.id;

      const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      const from = (req.query.from as string) || thirtyAgo;
      const to   = (req.query.to   as string) || today;

      let recWhere: any = { date: { [Op.between]: [from, to] } };
      let userWhere: any = { is_active: true, role: { [Op.ne]: 'super_admin' } };
      let userInclude: any[] = [];

      if (role === 'super_admin') {
        if (req.query.tenant_id) {
          recWhere.tenant_id = req.query.tenant_id;
          userWhere.tenant_id = req.query.tenant_id;
        }
        userInclude = [{ model: Tenant, as: 'tenant', attributes: ['id', 'name'] }];
      } else if (role === 'tenant_admin' || role === 'sales_manager') {
        recWhere.tenant_id = tenantId;
        if (req.query.user_id) recWhere.user_id = req.query.user_id;
      } else {
        recWhere.user_id = userId;
      }

      const records = await RepAvailability.findAll({
        where: recWhere,
        include: [{
          model: User,
          as: 'user',
          where: userWhere,
          attributes: ['id', 'first_name', 'last_name', 'role', 'tenant_id'],
          include: userInclude,
        }],
        order: [['date', 'DESC']],
        limit: 500,
      });

      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async setAttendance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId, date } = req.params;
      const { status, notes } = req.body;
      const actorRole = req.user!.role;
      const actorTenantId = req.user!.tenant_id;

      const targetUser = await User.findByPk(userId, { attributes: ['id', 'tenant_id'] });
      if (!targetUser) { res.status(404).json({ error: 'User not found.' }); return; }

      if (actorRole !== 'super_admin' && (targetUser as any).tenant_id !== actorTenantId) {
        res.status(403).json({ error: 'Insufficient permissions.' });
        return;
      }

      const existing = await RepAvailability.findOne({ where: { user_id: userId, date } });
      let record;
      if (existing) {
        await existing.update({ status, notes: notes || null });
        record = existing;
      } else {
        record = await RepAvailability.create({
          tenant_id: (targetUser as any).tenant_id,
          user_id: userId,
          date,
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
