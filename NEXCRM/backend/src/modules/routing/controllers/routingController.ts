import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../../../middleware/auth';
import { RoutingRule, Lead, User } from '../../../database/models';
import RoutingLog from '../../../database/models/RoutingLog';
import { RoutingEngineService } from '../services/routingEngineService';

const engine = new RoutingEngineService();

export class RoutingController {
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

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Auto-assign priority if not provided
      let priority = req.body.priority;
      if (!priority) {
        const maxRule = await RoutingRule.findOne({
          where: { tenant_id: req.user!.tenant_id },
          order: [['priority', 'DESC']],
        });
        priority = maxRule ? (maxRule.priority + 1) : 1;
      }

      const rule = await RoutingRule.create({
        tenant_id: req.user!.tenant_id,
        name: req.body.name,
        description: req.body.description,
        condition_expression: req.body.condition_expression,
        action_config: req.body.action_config,
        priority,
        is_active: req.body.is_active !== false,
      });
      res.status(201).json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const allowed = ['name', 'description', 'condition_expression', 'action_config', 'priority', 'is_active'];
      const updates: any = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

      const [updated] = await RoutingRule.update(updates, { where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
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
      await RoutingRule.update({ is_active: !rule.is_active } as any, { where: { id: rule.id } });
      const updated = await RoutingRule.findByPk(rule.id);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async clone(req: AuthRequest, res: Response): Promise<void> {
    try {
      const source = await RoutingRule.findOne({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!source) { res.status(404).json({ error: 'Rule not found.' }); return; }

      const maxRule = await RoutingRule.findOne({
        where: { tenant_id: req.user!.tenant_id },
        order: [['priority', 'DESC']],
      });
      const priority = maxRule ? maxRule.priority + 1 : 1;

      const clone = await RoutingRule.create({
        tenant_id: req.user!.tenant_id,
        name: `${source.name} (Copy)`,
        description: source.description,
        condition_expression: source.condition_expression,
        action_config: source.action_config,
        priority,
        is_active: false,
      });
      res.status(201).json(clone);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async reorder(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Body: { ids: string[] } — ordered array, index 0 = priority 1
      const { ids } = req.body;
      if (!Array.isArray(ids)) { res.status(400).json({ error: 'ids must be an array.' }); return; }

      await Promise.all(
        ids.map((id: string, idx: number) =>
          RoutingRule.update({ priority: idx + 1 } as any, { where: { id, tenant_id: req.user!.tenant_id } })
        )
      );

      const rules = await RoutingRule.findAll({
        where: { tenant_id: req.user!.tenant_id },
        order: [['priority', 'ASC']],
      });
      res.json(rules);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async run(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const result = await engine.routeLead(req.user!.tenant_id, leadId, 'manual');
      if (!result) {
        res.json({ matched: false, message: 'No active rule matched this lead.' });
        return;
      }
      res.json({ matched: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async simulate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { lead_id } = req.body;
      if (!lead_id) { res.status(400).json({ error: 'lead_id is required.' }); return; }
      const results = await engine.simulateLead(req.user!.tenant_id, lead_id);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rule_id, limit = 50, page = 1 } = req.query;
      const where: any = { tenant_id: req.user!.tenant_id };
      if (rule_id) where.rule_id = rule_id;

      const offset = (Number(page) - 1) * Number(limit);

      const { rows, count } = await (RoutingLog as any).findAndCountAll({
        where,
        include: [
          { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: RoutingRule, as: 'rule', attributes: ['id', 'name'] },
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
      });

      res.json({ logs: rows, total: count, page: Number(page), limit: Number(limit) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
