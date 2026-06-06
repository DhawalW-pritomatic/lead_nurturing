import { Op } from 'sequelize';
import { Lead, OutreachRecord, Sequence, SequenceEnrollment } from '../../../database/models';
import { AppError } from '../../../middleware/errorHandler';

interface DateWindow {
  created_at?: {
    [Op.between]: [Date, Date];
  };
}

export class SequenceAnalyticsService {
  private buildDateWindow(startDate?: string, endDate?: string): DateWindow {
    if (!startDate || !endDate) return {};

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return {};

    return {
      created_at: {
        [Op.between]: [start, end],
      },
    };
  }

  private uniqCount(values: Array<string | undefined | null>): number {
    return new Set(values.filter(Boolean) as string[]).size;
  }

  async getSequenceAnalytics(tenantId: string, sequenceId: string, startDate?: string, endDate?: string): Promise<any> {
    const sequence = await Sequence.findOne({ where: { id: sequenceId, tenant_id: tenantId } });
    if (!sequence) throw new AppError('Sequence not found.', 404);

    const dateWindow = this.buildDateWindow(startDate, endDate);

    const enrollments = await SequenceEnrollment.findAll({
      where: {
        tenant_id: tenantId,
        sequence_id: sequenceId,
        ...dateWindow,
      },
      attributes: ['id', 'lead_id', 'status', 'exit_reason', 'started_at', 'completed_at', 'metadata'],
    });

    const enrollmentIds = enrollments.map((e: any) => e.id);
    const enrolledLeadIds = enrollments.map((e: any) => e.lead_id);

    const outreachRecords = enrollmentIds.length
      ? await OutreachRecord.findAll({
          where: {
            tenant_id: tenantId,
            sequence_id: sequenceId,
            sequence_enrollment_id: { [Op.in]: enrollmentIds },
          },
          attributes: ['id', 'lead_id', 'status', 'sequence_step', 'created_at'],
        })
      : [];

    const convertedCount = enrolledLeadIds.length
      ? await Lead.count({
          where: {
            tenant_id: tenantId,
            id: { [Op.in]: enrolledLeadIds },
            [Op.or]: [{ status: 'CONVERTED' }, { lead_type: 'CONVERTED' }],
          },
        })
      : 0;

    const byStatus = {
      active: enrollments.filter((e: any) => e.status === 'active').length,
      paused: enrollments.filter((e: any) => e.status === 'paused').length,
      completed: enrollments.filter((e: any) => e.status === 'completed').length,
      exited: enrollments.filter((e: any) => e.status === 'exited').length,
    };

    const stepMap = new Map<number, any>();
    const sequenceSteps = (sequence.steps as any[]) || [];
    sequenceSteps.forEach((step: any, index: number) => {
      stepMap.set(index, {
        step_index: index,
        day_offset: Number(step.day_offset ?? step.dayOffset ?? step.day ?? 0),
        template_id: step.template_id ?? step.templateId ?? null,
        track: String(step.track ?? step.segment ?? 'all'),
        sent: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        unique_leads_reached: 0,
      });
    });

    const stepLeadBuckets: Record<number, Set<string>> = {};

    for (const record of outreachRecords as any[]) {
      const step = Number(record.sequence_step);
      if (!Number.isFinite(step) || step < 0 || step >= 1000) continue;

      if (!stepMap.has(step)) {
        stepMap.set(step, {
          step_index: step,
          day_offset: null,
          template_id: null,
          track: 'unknown',
          sent: 0,
          opened: 0,
          clicked: 0,
          failed: 0,
          unique_leads_reached: 0,
        });
      }

      if (!stepLeadBuckets[step]) stepLeadBuckets[step] = new Set<string>();
      if (record.lead_id) stepLeadBuckets[step].add(record.lead_id);

      const stepStats = stepMap.get(step);
      if (!stepStats) continue;

      if (['sent', 'opened', 'clicked'].includes(record.status)) stepStats.sent += 1;
      if (record.status === 'opened') stepStats.opened += 1;
      if (record.status === 'clicked') stepStats.clicked += 1;
      if (record.status === 'failed') stepStats.failed += 1;
    }

    for (const [stepIndex, bucket] of Object.entries(stepLeadBuckets)) {
      const stepStats = stepMap.get(Number(stepIndex));
      if (stepStats) stepStats.unique_leads_reached = bucket.size;
    }

    const coldLoopRecords = outreachRecords.filter((record: any) => Number(record.sequence_step) >= 1000);
    const coldLoopLeadIds = coldLoopRecords.map((r: any) => r.lead_id);
    const coldLoopUniqueLeads = this.uniqCount(coldLoopLeadIds);

    const coldLoopConverted = coldLoopUniqueLeads
      ? await Lead.count({
          where: {
            tenant_id: tenantId,
            id: { [Op.in]: [...new Set(coldLoopLeadIds)] },
            [Op.or]: [{ status: 'CONVERTED' }, { lead_type: 'CONVERTED' }],
          },
        })
      : 0;

    const totalEnrollments = enrollments.length;
    const conversionRate = totalEnrollments > 0 ? ((convertedCount / totalEnrollments) * 100).toFixed(1) : '0.0';

    return {
      sequence: {
        id: sequence.id,
        name: sequence.name,
        application_type_id: sequence.application_type_id,
        status: sequence.status,
      },
      date_window: { start_date: startDate || null, end_date: endDate || null },
      enrollment_funnel: {
        total_started: totalEnrollments,
        active: byStatus.active,
        paused: byStatus.paused,
        completed: byStatus.completed,
        exited: byStatus.exited,
        converted: convertedCount,
        conversion_rate: conversionRate,
      },
      step_performance: Array.from(stepMap.values()).sort((a: any, b: any) => a.step_index - b.step_index),
      cold_followup_effectiveness: {
        sent: coldLoopRecords.filter((r: any) => ['sent', 'opened', 'clicked'].includes(r.status)).length,
        opened: coldLoopRecords.filter((r: any) => r.status === 'opened').length,
        clicked: coldLoopRecords.filter((r: any) => r.status === 'clicked').length,
        failed: coldLoopRecords.filter((r: any) => r.status === 'failed').length,
        unique_leads_reached: coldLoopUniqueLeads,
        converted_from_cold_loop: coldLoopConverted,
        conversion_rate: coldLoopUniqueLeads > 0 ? ((coldLoopConverted / coldLoopUniqueLeads) * 100).toFixed(1) : '0.0',
      },
      exit_reasons: enrollments.reduce((acc: Record<string, number>, enrollment: any) => {
        const key = enrollment.exit_reason || 'none';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  async getOverviewAnalytics(tenantId: string, startDate?: string, endDate?: string): Promise<any> {
    const dateWindow = this.buildDateWindow(startDate, endDate);

    const [totalSequences, activeSequences, enrollments, outreach] = await Promise.all([
      Sequence.count({ where: { tenant_id: tenantId } }),
      Sequence.count({ where: { tenant_id: tenantId, status: 'active' } }),
      SequenceEnrollment.findAll({
        where: { tenant_id: tenantId, ...dateWindow },
        attributes: ['lead_id', 'status'],
      }),
      OutreachRecord.findAll({
        where: { tenant_id: tenantId },
        attributes: ['status', 'sequence_step', 'lead_id'],
      }),
    ]);

    const enrolledLeadIds = [...new Set(enrollments.map((e: any) => e.lead_id))];
    const convertedLeads = enrolledLeadIds.length
      ? await Lead.count({
          where: {
            tenant_id: tenantId,
            id: { [Op.in]: enrolledLeadIds },
            [Op.or]: [{ status: 'CONVERTED' }, { lead_type: 'CONVERTED' }],
          },
        })
      : 0;

    return {
      date_window: { start_date: startDate || null, end_date: endDate || null },
      sequences: {
        total: totalSequences,
        active: activeSequences,
      },
      enrollments: {
        total: enrollments.length,
        active: enrollments.filter((e: any) => e.status === 'active').length,
        paused: enrollments.filter((e: any) => e.status === 'paused').length,
        completed: enrollments.filter((e: any) => e.status === 'completed').length,
        exited: enrollments.filter((e: any) => e.status === 'exited').length,
        converted_leads: convertedLeads,
      },
      delivery: {
        sent: outreach.filter((r: any) => r.sequence_id && ['sent', 'opened', 'clicked'].includes(r.status)).length,
        opened: outreach.filter((r: any) => r.sequence_id && r.status === 'opened').length,
        clicked: outreach.filter((r: any) => r.sequence_id && r.status === 'clicked').length,
        failed: outreach.filter((r: any) => r.sequence_id && r.status === 'failed').length,
      },
      cold_followup: {
        sent: outreach.filter((r: any) => r.sequence_id && Number(r.sequence_step) >= 1000 && ['sent', 'opened', 'clicked'].includes(r.status)).length,
        reached_leads: this.uniqCount(outreach.filter((r: any) => r.sequence_id && Number(r.sequence_step) >= 1000).map((r: any) => r.lead_id)),
      },
    };
  }
}
