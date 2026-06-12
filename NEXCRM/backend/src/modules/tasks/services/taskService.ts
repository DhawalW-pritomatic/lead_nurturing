import { Op } from 'sequelize';
import { Task, Lead, User, RepAvailability } from '../../../database/models';
import { AppError } from '../../../middleware/errorHandler';

export class TaskService {

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private async getAvailableReps(tenantId: string): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];

    const reps = await User.findAll({
      where: {
        tenant_id: tenantId,
        role: { [Op.in]: ['sales_rep', 'senior_sales_rep'] },
      },
      attributes: ['id', 'first_name', 'last_name'],
    });

    if (reps.length === 0) return [];

    const absences = await RepAvailability.findAll({
      where: {
        tenant_id: tenantId,
        date: today,
        user_id: { [Op.in]: reps.map((r: any) => r.id) },
        status: 'on_leave',
      },
      attributes: ['user_id'],
    });
    const absentIds = new Set(absences.map((a: any) => a.user_id));

    return reps.filter((r: any) => !absentIds.has(r.id));
  }

  // Picks the rep with the fewest open tasks (least-loaded round-robin)
  async pickRoundRobinRep(tenantId: string): Promise<string | null> {
    const available = await this.getAvailableReps(tenantId);
    if (available.length === 0) return null;

    const repIds = available.map((r: any) => r.id);

    const taskCounts = await Task.findAll({
      where: {
        tenant_id: tenantId,
        assigned_to_user_id: { [Op.in]: repIds },
        status: { [Op.in]: ['open', 'in_progress'] },
      },
      attributes: ['assigned_to_user_id'],
      raw: true,
    });

    const countMap = new Map<string, number>(repIds.map((id: string) => [id, 0]));
    taskCounts.forEach((t: any) => {
      const prev = countMap.get(t.assigned_to_user_id) ?? 0;
      countMap.set(t.assigned_to_user_id, prev + 1);
    });

    let minCount = Infinity;
    let selectedId = repIds[0];
    for (const id of repIds) {
      const c = countMap.get(id) ?? 0;
      if (c < minCount) {
        minCount = c;
        selectedId = id;
      }
    }

    return selectedId;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async createTask(tenantId: string, createdByUserId: string, data: any): Promise<any> {
    let assignedTo = data.assigned_to_user_id ?? null;

    if (!assignedTo) {
      if (data.lead_id) {
        const lead = await Lead.findOne({ where: { id: data.lead_id, tenant_id: tenantId }, attributes: ['assigned_rep_id'] });
        assignedTo = lead?.assigned_rep_id ?? await this.pickRoundRobinRep(tenantId) ?? createdByUserId;
      } else {
        assignedTo = await this.pickRoundRobinRep(tenantId) ?? createdByUserId;
      }
    }

    const task = await Task.create({
      tenant_id: tenantId,
      lead_id: data.lead_id ?? undefined,
      created_by_user_id: createdByUserId,
      assigned_to_user_id: assignedTo,
      title: data.title,
      description: data.description ?? undefined,
      task_type: data.task_type ?? 'follow_up',
      priority: data.priority ?? 'medium',
      status: 'open',
      is_auto_generated: false,
      due_date: data.due_date ?? undefined,
    });

    return this.getTaskById(tenantId, task.id);
  }

  async getTasks(tenantId: string, userId: string, role: string, query: any): Promise<any> {
    const { filter = 'all', status, priority, task_type, lead_id, assigned_to_user_id, page = 1, limit = 50 } = query;

    const where: any = { tenant_id: tenantId };
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    // Reps see only their own tasks
    if (role === 'sales_rep') where.assigned_to_user_id = userId;

    switch (filter) {
      case 'mine':
        where.assigned_to_user_id = userId;
        if (!status) where.status = { [Op.in]: ['open', 'in_progress'] };
        break;
      case 'overdue':
        where.due_date = { [Op.lt]: todayStart };
        where.status = { [Op.in]: ['open', 'in_progress'] };
        break;
      case 'today':
        where.due_date = { [Op.between]: [todayStart, todayEnd] };
        if (!status) where.status = { [Op.in]: ['open', 'in_progress'] };
        break;
      case 'completed':
        where.status = 'completed';
        break;
      default:
        if (!status) where.status = { [Op.ne]: 'cancelled' };
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (task_type) where.task_type = task_type;
    if (lead_id) where.lead_id = lead_id;
    if (assigned_to_user_id && role !== 'sales_rep') where.assigned_to_user_id = assigned_to_user_id;

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email', 'company'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'createdBy', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [
        ['due_date', 'ASC'],
        ['priority', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit: Number(limit),
      offset,
    });

    return { tasks: rows, total: count, page: Number(page), total_pages: Math.ceil(count / Number(limit)) };
  }

  async getStats(tenantId: string, userId: string, role: string): Promise<any> {
    const base: any = { tenant_id: tenantId };
    if (role === 'sales_rep') base.assigned_to_user_id = userId;

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [open, overdue, dueToday, completedThisWeek] = await Promise.all([
      Task.count({ where: { ...base, status: { [Op.in]: ['open', 'in_progress'] } } }),
      Task.count({ where: { ...base, status: { [Op.in]: ['open', 'in_progress'] }, due_date: { [Op.lt]: todayStart } } }),
      Task.count({ where: { ...base, status: { [Op.in]: ['open', 'in_progress'] }, due_date: { [Op.between]: [todayStart, todayEnd] } } }),
      Task.count({ where: { ...base, status: 'completed', completed_at: { [Op.gte]: weekAgo } } }),
    ]);

    return { open, overdue, due_today: dueToday, completed_this_week: completedThisWeek };
  }

  async getTaskById(tenantId: string, taskId: string): Promise<any> {
    const task = await Task.findOne({
      where: { id: taskId, tenant_id: tenantId },
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email', 'company'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'createdBy', attributes: ['id', 'first_name', 'last_name'] },
      ],
    });
    if (!task) throw new AppError('Task not found.', 404);
    return task;
  }

  async updateTask(tenantId: string, taskId: string, data: any): Promise<any> {
    const task = await Task.findOne({ where: { id: taskId, tenant_id: tenantId } });
    if (!task) throw new AppError('Task not found.', 404);

    const updates: any = {};
    const allowed = ['title', 'description', 'task_type', 'priority', 'status', 'assigned_to_user_id', 'due_date'];
    for (const field of allowed) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    await task.update(updates);
    return this.getTaskById(tenantId, taskId);
  }

  async completeTask(tenantId: string, taskId: string): Promise<any> {
    const task = await Task.findOne({ where: { id: taskId, tenant_id: tenantId } });
    if (!task) throw new AppError('Task not found.', 404);
    await task.update({ status: 'completed', completed_at: new Date() });
    return this.getTaskById(tenantId, taskId);
  }

  async deleteTask(tenantId: string, taskId: string): Promise<void> {
    const deleted = await Task.destroy({ where: { id: taskId, tenant_id: tenantId } });
    if (!deleted) throw new AppError('Task not found.', 404);
  }

  // ─── Availability ─────────────────────────────────────────────────────────

  async getTodayAvailability(tenantId: string): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];

    const reps = await User.findAll({
      where: { tenant_id: tenantId, role: { [Op.in]: ['sales_rep', 'senior_sales_rep', 'sales_manager', 'tenant_admin'] } },
      attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
    });

    const records = await RepAvailability.findAll({
      where: { tenant_id: tenantId, date: today },
    });
    const availMap = new Map(records.map((r: any) => [r.user_id, r]));

    return reps.map((rep: any) => {
      const record = availMap.get(rep.id);
      return {
        user: rep,
        status: record?.status ?? 'available',
        notes: record?.notes ?? null,
        record_id: record?.id ?? null,
      };
    });
  }

  async setAvailability(tenantId: string, userId: string, status: string, notes?: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];

    const [record, created] = await RepAvailability.findOrCreate({
      where: { tenant_id: tenantId, user_id: userId, date: today },
      defaults: { tenant_id: tenantId, user_id: userId, date: today, status: status as any, notes },
    });

    if (!created) {
      await record.update({ status: status as any, notes });
    }

    return record;
  }

  // ─── Auto-generation (called from scoring/tracking services) ──────────────

  async autoCreateForHotLead(tenantId: string, lead: any): Promise<void> {
    const existing = await Task.findOne({
      where: {
        tenant_id: tenantId,
        lead_id: lead.id,
        trigger_event: 'lead_became_hot',
        status: { [Op.in]: ['open', 'in_progress'] },
      },
    });
    if (existing) return;

    const assignedTo = lead.assigned_rep_id ?? await this.pickRoundRobinRep(tenantId);
    const dueDate = new Date(); dueDate.setHours(23, 59, 0, 0);

    await Task.create({
      tenant_id: tenantId,
      lead_id: lead.id,
      created_by_user_id: assignedTo ?? lead.enrolled_by,
      assigned_to_user_id: assignedTo ?? undefined,
      title: `Call HOT lead: ${lead.first_name} ${lead.last_name}`,
      description: `Lead score reached HOT (80+). Immediate follow-up recommended.\nCompany: ${lead.company ?? 'N/A'} | Phone: ${lead.phone ?? 'N/A'}`,
      task_type: 'call',
      priority: 'high',
      status: 'open',
      is_auto_generated: true,
      trigger_event: 'lead_became_hot',
      due_date: dueDate,
    });
  }

  async autoCreateForInboundQuery(tenantId: string, lead: any, ownerUserId: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existing = await Task.findOne({
      where: {
        tenant_id: tenantId,
        lead_id: lead.id,
        trigger_event: 'inbound_query',
        status: { [Op.in]: ['open', 'in_progress'] },
        created_at: { [Op.gte]: oneHourAgo },
      },
    });
    if (existing) return;

    const dueDate = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now

    await Task.create({
      tenant_id: tenantId,
      lead_id: lead.id,
      created_by_user_id: ownerUserId,
      assigned_to_user_id: ownerUserId,
      title: `Reply to inbound message: ${lead.first_name} ${lead.last_name}`,
      description: `${lead.first_name} sent an inbound message. Reply within 4 hours.`,
      task_type: 'email',
      priority: 'high',
      status: 'open',
      is_auto_generated: true,
      trigger_event: 'inbound_query',
      due_date: dueDate,
    });
  }

  async autoCreateForStaleLead(tenantId: string, lead: any): Promise<void> {
    const existing = await Task.findOne({
      where: {
        tenant_id: tenantId,
        lead_id: lead.id,
        trigger_event: 'lead_stale',
        status: { [Op.in]: ['open', 'in_progress'] },
      },
    });
    if (existing) return;

    const assignedTo = lead.assigned_rep_id ?? await this.pickRoundRobinRep(tenantId);
    const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now

    await Task.create({
      tenant_id: tenantId,
      lead_id: lead.id,
      created_by_user_id: assignedTo ?? lead.enrolled_by,
      assigned_to_user_id: assignedTo ?? undefined,
      title: `Re-engage stale lead: ${lead.first_name} ${lead.last_name}`,
      description: `${lead.first_name} has been inactive for 30+ days. Send a re-engagement message or call.`,
      task_type: 'follow_up',
      priority: 'medium',
      status: 'open',
      is_auto_generated: true,
      trigger_event: 'lead_stale',
      due_date: dueDate,
    });
  }
}
