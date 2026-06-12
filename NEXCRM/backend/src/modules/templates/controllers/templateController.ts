import { Response } from 'express';
import { QueryTypes } from 'sequelize';
import { AuthRequest } from '../../../middleware/auth';
import { Template, Tenant } from '../../../database/models';

export class TemplateController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const template = await Template.create({
        tenant_id: req.user!.tenant_id,
        application_type_id: req.body.application_type_id || null,
        name: req.body.name,
        channel: req.body.channel || 'email',
        subject: req.body.subject,
        body: req.body.body,
        variables: req.body.variables || [],
        category: req.body.category || 'general',
        created_by: req.user!.id,
      });
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, channel, application_type_id } = req.query;
      const where: any = {};
      if (req.user!.role !== 'super_admin') {
        where.tenant_id = req.user!.tenant_id;
      }
      if (category) where.category = category;
      if (channel) where.channel = channel;
      if (application_type_id) where.application_type_id = application_type_id;

      const include: any[] = [];
      if (req.user!.role === 'super_admin') {
        include.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
      }

      const templates = await Template.findAll({ where, include, order: [['created_at', 'DESC']] });

      if (req.user!.role === 'super_admin') {
        let assignmentMap: Record<string, Array<{ id: string; name: string }>> = {};
        let assignedFromMap: Record<string, string | null> = {};
        try {
          // Build assignment map: which tenants each original template was assigned to
          const assignedRows = await Template.sequelize!.query<{ id: string; assigned_from_id: string; tenant_id: string; tenant_name: string }>(
            `SELECT t.id, t.assigned_from_id, t.tenant_id, ten.name AS tenant_name
             FROM templates t
             JOIN tenants ten ON ten.id = t.tenant_id
             WHERE t.assigned_from_id IS NOT NULL`,
            { type: QueryTypes.SELECT }
          );
          for (const row of assignedRows) {
            if (!assignmentMap[row.assigned_from_id]) assignmentMap[row.assigned_from_id] = [];
            assignmentMap[row.assigned_from_id].push({ id: row.tenant_id, name: row.tenant_name });
          }

          // Also fetch assigned_from_id for every returned template so the frontend can deduplicate
          const ids = templates.map((t: any) => t.id);
          if (ids.length > 0) {
            const fromRows = await Template.sequelize!.query<{ id: string; assigned_from_id: string | null }>(
              `SELECT id, assigned_from_id FROM templates WHERE id IN (:ids)`,
              { replacements: { ids }, type: QueryTypes.SELECT }
            );
            for (const row of fromRows) {
              assignedFromMap[row.id] = row.assigned_from_id;
            }
          }
        } catch {
          // Column not yet migrated — assignment info will be empty until server restarts
        }

        const result = templates.map((t: any) => ({
          ...t.toJSON(),
          assignedTenants: assignmentMap[t.id] || [],
          assigned_from_id: assignedFromMap[t.id] ?? null,
        }));
        res.json(result);
        return;
      }

      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const where: any = { id: req.params.id };
      if (req.user!.role !== 'super_admin') {
        where.tenant_id = req.user!.tenant_id;
      }
      const template = await Template.findOne({ where });
      if (!template) { res.status(404).json({ error: 'Template not found.' }); return; }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [updated] = await Template.update(req.body, { where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!updated) { res.status(404).json({ error: 'Template not found.' }); return; }
      const template = await Template.findByPk(req.params.id);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const deleted = await Template.destroy({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!deleted) { res.status(404).json({ error: 'Template not found.' }); return; }
      res.json({ message: 'Template deleted.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async assign(req: AuthRequest, res: Response): Promise<void> {
    try {
      const source = await Template.findByPk(req.params.id);
      if (!source) { res.status(404).json({ error: 'Template not found.' }); return; }

      const targetTenantId: string = req.body.tenant_id;
      if (!targetTenantId) { res.status(400).json({ error: 'tenant_id is required.' }); return; }

      const targetTenant = await Tenant.findByPk(targetTenantId);
      if (!targetTenant) { res.status(404).json({ error: 'Target tenant not found.' }); return; }

      // Check if already assigned to this tenant (raw query — column not in Sequelize model)
      const existing = await Template.sequelize!.query<{ id: string }>(
        `SELECT id FROM templates WHERE assigned_from_id = :sourceId AND tenant_id = :targetTenantId LIMIT 1`,
        { replacements: { sourceId: source.id, targetTenantId }, type: QueryTypes.SELECT }
      );
      if (existing.length > 0) {
        res.status(409).json({ error: `Template already assigned to ${(targetTenant as any).name}.` });
        return;
      }

      // Create the copy first, then stamp assigned_from_id via raw UPDATE
      const copy = await Template.create({
        tenant_id: targetTenantId,
        application_type_id: source.application_type_id || undefined,
        name: source.name,
        channel: source.channel,
        subject: source.subject,
        body: source.body,
        variables: source.variables || [],
        category: source.category,
        created_by: req.user!.id,
      });

      await Template.sequelize!.query(
        `UPDATE templates SET assigned_from_id = :sourceId WHERE id = :copyId`,
        { replacements: { sourceId: source.id, copyId: copy.id }, type: QueryTypes.UPDATE }
      );

      res.status(201).json({ message: 'Template assigned successfully.', template: copy });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
