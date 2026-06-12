import { Task, Lead, User } from '../../../database/models';

export class TaskService {
  async getAll(tenantId: string, query: any): Promise<any> {
    const where: any = { tenant_id: tenantId };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assigned_to) where.assigned_to = query.assigned_to;
    if (query.lead_id) where.lead_id = query.lead_id;

    const tasks = await Task.findAll({
      where,
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'phone', 'lead_type'] },
        { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [
        ['due_date', 'ASC'],
        ['created_at', 'DESC'],
      ],
    });

    return {
      tasks,
      grouped: {
        todo: tasks.filter((t) => t.status === 'todo'),
        in_progress: tasks.filter((t) => t.status === 'in_progress'),
        done: tasks.filter((t) => t.status === 'done'),
        cancelled: tasks.filter((t) => t.status === 'cancelled'),
      },
    };
  }

  async create(tenantId: string, userId: string, data: any): Promise<Task> {
    const task = await Task.create({
      tenant_id: tenantId,
      title: data.title,
      description: data.description,
      priority: data.priority || 'medium',
      status: 'todo',
      lead_id: data.lead_id || undefined,
      assigned_to: data.assigned_to || userId,
      created_by: userId,
      due_date: data.due_date ? new Date(data.due_date) : undefined,
    });

    return task.reload({
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'lead_type'] },
        { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name'] },
      ],
    });
  }

  async update(tenantId: string, taskId: string, data: any): Promise<Task> {
    const task = await Task.findOne({ where: { id: taskId, tenant_id: tenantId } });
    if (!task) throw new Error('Task not found.');

    const updates: any = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === 'done') updates.completed_at = new Date();
    }
    if (data.assigned_to !== undefined) updates.assigned_to = data.assigned_to || null;
    if (data.due_date !== undefined) updates.due_date = data.due_date ? new Date(data.due_date) : null;
    if (data.lead_id !== undefined) updates.lead_id = data.lead_id || null;

    await task.update(updates);
    return task.reload({
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'lead_type'] },
        { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name'] },
      ],
    });
  }

  async delete(tenantId: string, taskId: string): Promise<void> {
    await Task.destroy({ where: { id: taskId, tenant_id: tenantId } });
  }
}
