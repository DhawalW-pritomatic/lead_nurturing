import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../../../middleware/auth';
import { User, Lead, Tenant } from '../../../database/models';
import { Op } from 'sequelize';
import sequelize from '../../../config/database';

export class UserController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const passwordHash = await bcrypt.hash(req.body.password || 'Welcome@123', 12);
      const user = await User.create({
        tenant_id: req.user!.tenant_id,
        email: req.body.email,
        password_hash: passwordHash,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        role: req.body.role,
        phone: req.body.phone,
        territory: req.body.territory,
        rep_tags: req.body.rep_tags || [],
      });
      const { password_hash, mfa_secret, ...userData } = user.toJSON() as any;
      res.status(201).json(userData);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const isSuperAdmin = req.user!.role === 'super_admin';
      const where: any = {};
      if (!isSuperAdmin) where.tenant_id = req.user!.tenant_id;
      if (req.query.role) where.role = req.query.role;
      if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
      if (req.query.tenant_id && isSuperAdmin) where.tenant_id = req.query.tenant_id;

      const include: any[] = [];
      if (isSuperAdmin) {
        include.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
      }

      const users = await User.findAll({
        where,
        include,
        attributes: { exclude: ['password_hash', 'mfa_secret'] },
        order: [['first_name', 'ASC']],
      });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const isSuperAdmin = req.user!.role === 'super_admin';
      const where: any = { id: req.params.id };
      if (!isSuperAdmin) where.tenant_id = req.user!.tenant_id;

      const include: any[] = [];
      if (isSuperAdmin) {
        include.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
      }

      const user = await User.findOne({
        where,
        include,
        attributes: { exclude: ['password_hash', 'mfa_secret'] },
      });
      if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const allowedFields = ['first_name', 'last_name', 'phone', 'territory', 'rep_tags', 'role', 'is_active'];
      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      }
      if (req.body.password) {
        updateData.password_hash = await bcrypt.hash(req.body.password, 12);
      }

      await User.update(updateData, { where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password_hash', 'mfa_secret'] } });
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await User.update({ is_active: false }, { where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      res.json({ message: 'User deactivated.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRepPerformance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const isSuperAdmin = req.user!.role === 'super_admin';
      const repWhere: any = {
        role: { [Op.in]: ['sales_rep', 'senior_sales_rep'] },
        is_active: true,
      };
      if (!isSuperAdmin) repWhere.tenant_id = req.user!.tenant_id;

      const repInclude: any[] = [];
      if (isSuperAdmin) {
        repInclude.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
      }

      const reps = await User.findAll({
        where: repWhere,
        include: repInclude,
        attributes: { exclude: ['password_hash', 'mfa_secret'] },
      });

      const performance = await Promise.all(
        reps.map(async (rep: any) => {
          const leadWhereBase: any = { assigned_rep_id: rep.id };
          if (!isSuperAdmin) leadWhereBase.tenant_id = req.user!.tenant_id;
          else leadWhereBase.tenant_id = rep.tenant_id;

          const [totalLeads, hotLeads, convertedLeads] = await Promise.all([
            Lead.count({ where: leadWhereBase }),
            Lead.count({ where: { ...leadWhereBase, lead_type: 'HOT' } }),
            Lead.count({ where: { ...leadWhereBase, lead_type: 'CONVERTED' } }),
          ]);
          return {
            rep: { id: rep.id, name: `${rep.first_name} ${rep.last_name}`, email: rep.email },
            tenant: rep.tenant ? { id: rep.tenant.id, name: rep.tenant.name } : undefined,
            total_leads: totalLeads,
            hot_leads: hotLeads,
            converted_leads: convertedLeads,
            conversion_rate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0',
          };
        })
      );

      res.json(performance.sort((a: any, b: any) => b.converted_leads - a.converted_leads));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
