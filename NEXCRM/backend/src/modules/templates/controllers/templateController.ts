import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { Template, Tenant } from '../../../database/models';
import { AppError } from '../../../middleware/errorHandler';

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
      res.status(500).json({ error: error.message });
    }
  }
}
