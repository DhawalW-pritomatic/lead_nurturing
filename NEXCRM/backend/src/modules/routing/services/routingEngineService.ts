import { Lead, RoutingRule, Task, SequenceEnrollment, Sequence } from '../../../database/models';
import RoutingLog from '../../../database/models/RoutingLog';

type ConditionOp = '>=' | '<=' | '>' | '<' | '==' | '!=' | 'contains';

interface Condition {
  field: string;
  op: ConditionOp;
  value: any;
}

interface ConditionExpression {
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

interface ActionConfig {
  action: string;
  rep_id?: string;
  pool_rep_ids?: string[];
  last_assigned_index?: number;
  sequence_id?: string;
  create_task?: boolean;
  task_title?: string;
}

export class RoutingEngineService {
  private evalCondition(c: Condition, lead: any, daysInactive: number, daysSinceCreated: number): boolean {
    let val: any;
    switch (c.field) {
      case 'score':              val = lead.score; break;
      case 'lead_type':         val = lead.lead_type; break;
      case 'status':            val = lead.status; break;
      case 'source':            val = lead.source; break;
      case 'days_inactive':     val = daysInactive; break;
      case 'days_since_created': val = daysSinceCreated; break;
      default: return false;
    }

    const a = val;
    const b = c.value;
    switch (c.op) {
      case '>=': return Number(a) >= Number(b);
      case '<=': return Number(a) <= Number(b);
      case '>':  return Number(a) > Number(b);
      case '<':  return Number(a) < Number(b);
      case '==': return String(a).toLowerCase() === String(b).toLowerCase();
      case '!=': return String(a).toLowerCase() !== String(b).toLowerCase();
      case 'contains': return String(a).toLowerCase().includes(String(b).toLowerCase());
      default:   return false;
    }
  }

  private evalExpression(expr: ConditionExpression, lead: any, daysInactive: number, daysSinceCreated: number): boolean {
    const { operator, conditions } = expr;
    if (!conditions || conditions.length === 0) return true;
    if (operator === 'OR') {
      return conditions.some(c => this.evalCondition(c, lead, daysInactive, daysSinceCreated));
    }
    return conditions.every(c => this.evalCondition(c, lead, daysInactive, daysSinceCreated));
  }

  private async enrollInSequence(tenantId: string, leadId: string, sequenceId: string): Promise<void> {
    const sequence = await Sequence.findOne({ where: { id: sequenceId, tenant_id: tenantId } });
    if (!sequence) return;
    const existing = await SequenceEnrollment.findOne({
      where: { lead_id: leadId, sequence_id: sequenceId, status: 'active' },
    });
    if (existing) return;
    const steps: any[] = (sequence as any).steps || [];
    const firstStep = steps[0];
    const nextStepAt = firstStep
      ? new Date(Date.now() + (firstStep.day || 0) * 24 * 60 * 60 * 1000)
      : new Date();
    await SequenceEnrollment.create({
      tenant_id: tenantId,
      lead_id: leadId,
      sequence_id: sequenceId,
      started_at: new Date(),
      status: 'active',
      current_step: 0,
      next_step_at: nextStepAt,
    });
  }

  private async executeAction(rule: any, lead: any, tenantId: string): Promise<string> {
    const cfg: ActionConfig = rule.action_config;

    switch (cfg.action) {
      case 'assign_rep': {
        if (!cfg.rep_id) return 'assign_rep: no rep configured';
        await Lead.update({ assigned_rep_id: cfg.rep_id }, { where: { id: lead.id } });
        if (cfg.create_task) {
          await Task.create({
            tenant_id: tenantId,
            title: cfg.task_title || `Follow up: ${lead.first_name} ${lead.last_name}`,
            lead_id: lead.id,
            assigned_to: cfg.rep_id,
            created_by: cfg.rep_id,
            priority: 'high',
            status: 'todo',
          });
        }
        if (cfg.sequence_id) {
          await this.enrollInSequence(tenantId, lead.id, cfg.sequence_id);
          return `Assigned to rep + enrolled in sequence`;
        }
        return `Assigned to rep`;
      }

      case 'assign_round_robin': {
        const pool: string[] = cfg.pool_rep_ids || [];
        if (!pool.length) return 'Round-robin: empty pool';
        const lastIdx = cfg.last_assigned_index ?? -1;
        const nextIdx = (lastIdx + 1) % pool.length;
        const repId = pool[nextIdx];
        await Lead.update({ assigned_rep_id: repId }, { where: { id: lead.id } });
        // Persist the new index in action_config
        await RoutingRule.update(
          { action_config: { ...cfg, last_assigned_index: nextIdx } as any },
          { where: { id: rule.id } }
        );
        if (cfg.create_task) {
          await Task.create({
            tenant_id: tenantId,
            title: cfg.task_title || `Follow up: ${lead.first_name} ${lead.last_name}`,
            lead_id: lead.id,
            assigned_to: repId,
            created_by: repId,
            priority: 'high',
            status: 'todo',
          });
        }
        if (cfg.sequence_id) {
          await this.enrollInSequence(tenantId, lead.id, cfg.sequence_id);
          return `Round-robin assigned (slot ${nextIdx + 1}/${pool.length}) + enrolled in sequence`;
        }
        return `Round-robin assigned (slot ${nextIdx + 1}/${pool.length})`;
      }

      case 'enroll_sequence': {
        if (!cfg.sequence_id) return 'enroll_sequence: no sequence configured';
        await this.enrollInSequence(tenantId, lead.id, cfg.sequence_id);
        return `Enrolled in sequence`;
      }

      case 'mark_failed': {
        await Lead.update({ lead_type: 'FAILED', status: 'FAILED' }, { where: { id: lead.id } });
        return 'Marked as failed';
      }

      case 'create_task': {
        const repId = lead.assigned_rep_id || cfg.rep_id;
        if (repId) {
          await Task.create({
            tenant_id: tenantId,
            title: cfg.task_title || `Follow up: ${lead.first_name} ${lead.last_name}`,
            lead_id: lead.id,
            assigned_to: repId,
            created_by: repId,
            priority: 'high',
            status: 'todo',
          });
        }
        return 'Task created';
      }

      default:
        return cfg.action;
    }
  }

  private computeDays(lead: any): { daysInactive: number; daysSinceCreated: number } {
    const now = Date.now();
    const lastActivity = lead.last_activity_at || lead.created_at;
    const daysInactive = Math.floor((now - new Date(lastActivity).getTime()) / 86_400_000);
    const daysSinceCreated = Math.floor((now - new Date(lead.created_at).getTime()) / 86_400_000);
    return { daysInactive, daysSinceCreated };
  }

  async routeLead(tenantId: string, leadId: string, trigger = 'system'): Promise<{ ruleId: string; ruleName: string; action: string } | null> {
    const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
    if (!lead) return null;

    const { daysInactive, daysSinceCreated } = this.computeDays(lead);

    const rules = await RoutingRule.findAll({
      where: { tenant_id: tenantId, is_active: true },
      order: [['priority', 'ASC']],
    });

    for (const rule of rules) {
      const expr = rule.condition_expression as ConditionExpression;
      if (!this.evalExpression(expr, lead, daysInactive, daysSinceCreated)) continue;

      const actionResult = await this.executeAction(rule, lead, tenantId);

      await (RoutingLog as any).create({
        tenant_id: tenantId,
        rule_id: rule.id,
        lead_id: leadId,
        action_taken: actionResult,
        triggered_by: trigger,
      });

      await RoutingRule.update(
        { match_count: (rule.match_count || 0) + 1 } as any,
        { where: { id: rule.id } }
      );

      return { ruleId: rule.id, ruleName: rule.name, action: actionResult };
    }

    return null;
  }

  async simulateLead(tenantId: string, leadId: string): Promise<Array<{ rule: any; matches: boolean }>> {
    const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
    if (!lead) return [];

    const { daysInactive, daysSinceCreated } = this.computeDays(lead);

    const rules = await RoutingRule.findAll({
      where: { tenant_id: tenantId, is_active: true },
      order: [['priority', 'ASC']],
    });

    return rules.map(rule => ({
      rule: { id: rule.id, name: rule.name, priority: rule.priority, action_config: rule.action_config },
      matches: this.evalExpression(rule.condition_expression as ConditionExpression, lead, daysInactive, daysSinceCreated),
    }));
  }
}
