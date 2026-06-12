import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../../../middleware/auth';
import { Lead, Task, Template, User, ApplicationType } from '../../../database/models';

export async function globalSearch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { q, limit = '6' } = req.query;
    const tenantId = req.user!.tenant_id;
    const userId = req.user!.id;
    const role = req.user!.role;
    const maxResults = Math.min(parseInt(limit as string) || 6, 10);
    const term = (q as string || '').trim();

    if (term.length < 2) {
      res.json({ leads: [], tasks: [], templates: [], total: 0 });
      return;
    }

    const like = `%${term}%`;

    const leadWhere: any = {
      tenant_id: tenantId,
      [Op.or]: [
        { first_name: { [Op.iLike]: like } },
        { last_name: { [Op.iLike]: like } },
        { email: { [Op.iLike]: like } },
        { phone: { [Op.iLike]: like } },
        { company: { [Op.iLike]: like } },
      ],
    };

    if (role === 'sales_rep') leadWhere.assigned_rep_id = userId;

    const [leads, tasks, templates] = await Promise.all([
      Lead.findAll({
        where: leadWhere,
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'company', 'lead_type', 'status', 'score'],
        include: [
          { model: User, as: 'assignedRep', attributes: ['id', 'first_name', 'last_name'] },
        ],
        limit: maxResults,
        order: [['updated_at', 'DESC']],
      }),
      Task.findAll({
        where: {
          tenant_id: tenantId,
          title: { [Op.iLike]: like },
        },
        include: [
          { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name'] },
          { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name'] },
        ],
        limit: maxResults,
        order: [['due_date', 'ASC'], ['created_at', 'DESC']],
      }),
      Template.findAll({
        where: {
          tenant_id: tenantId,
          is_active: true,
          [Op.or]: [
            { name: { [Op.iLike]: like } },
            { subject: { [Op.iLike]: like } },
          ],
        },
        attributes: ['id', 'name', 'category', 'subject'],
        limit: maxResults,
        order: [['name', 'ASC']],
      }),
    ]);

    res.json({
      leads,
      tasks,
      templates,
      total: leads.length + tasks.length + templates.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
