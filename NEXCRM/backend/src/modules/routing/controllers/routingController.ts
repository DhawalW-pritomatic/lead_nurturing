import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { RoutingRule } from '../../../database/models';

export class RoutingController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rule = await RoutingRule.create({
        tenant_id: req.user!.tenant_id,
        name: req.body.name,
        condition_expression: req.body.condition_expression,
        action_config: req.body.action_config,
        priority: req.body.priority,
        is_active: req.body.is_active !== false,
      });
      res.status(201).json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rules = await RoutingRule.findAll({
        where: { tenant_id: req.user!.tenant_id },
        order: [['priority', 'ASC']],
      });
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rule = await RoutingRule.findOne({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!rule) { res.status(404).json({ error: 'Routing rule not found.' }); return; }
      res.json(rule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [updated] = await RoutingRule.update(req.body, { where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!updated) { res.status(404).json({ error: 'Rule not found.' }); return; }
      const rule = await RoutingRule.findByPk(req.params.id);
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const deleted = await RoutingRule.destroy({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!deleted) { res.status(404).json({ error: 'Rule not found.' }); return; }
      res.json({ message: 'Rule deleted.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async toggle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rule = await RoutingRule.findOne({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!rule) { res.status(404).json({ error: 'Rule not found.' }); return; }
      await RoutingRule.update({ is_active: !rule.is_active }, { where: { id: rule.id } });
      res.json({ message: `Rule ${rule.is_active ? 'disabled' : 'enabled'}.` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
