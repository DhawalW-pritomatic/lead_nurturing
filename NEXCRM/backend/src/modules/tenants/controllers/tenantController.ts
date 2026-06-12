import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { Tenant, NurturingSettings, ApplicationType, ScoringProfile, TenantPhoneConfig } from '../../../database/models';

export class TenantController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenants = await Tenant.findAll({ order: [['name', 'ASC']] });
      res.json(tenants);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenant = await Tenant.findByPk(req.params.id, {
        include: [{ model: NurturingSettings, as: 'nurturingSettings' }],
      });
      if (!tenant) { res.status(404).json({ error: 'Tenant not found.' }); return; }
      res.json(tenant);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCurrent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenant = await Tenant.findByPk(req.user!.tenant_id, {
        include: [{ model: NurturingSettings, as: 'nurturingSettings' }],
      });
      if (!tenant) { res.status(404).json({ error: 'Tenant not found.' }); return; }
      res.json(tenant);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      await Tenant.update(req.body, { where: { id: req.user!.tenant_id } });
      const tenant = await Tenant.findByPk(req.user!.tenant_id);
      res.json(tenant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getNurturingSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      let settings = await NurturingSettings.findOne({ where: { tenant_id: req.user!.tenant_id } });
      if (!settings) {
        settings = await NurturingSettings.create({ tenant_id: req.user!.tenant_id });
      }
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateNurturingSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      let settings = await NurturingSettings.findOne({ where: { tenant_id: req.user!.tenant_id } });
      if (!settings) {
        settings = await NurturingSettings.create({ tenant_id: req.user!.tenant_id, ...req.body });
      } else {
        await NurturingSettings.update(req.body, { where: { tenant_id: req.user!.tenant_id } });
        settings = await NurturingSettings.findOne({ where: { tenant_id: req.user!.tenant_id } });
      }
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getApplicationTypes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const types = await ApplicationType.findAll({ where: { tenant_id: req.user!.tenant_id }, order: [['name', 'ASC']] });
      res.json(types);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createApplicationType(req: AuthRequest, res: Response): Promise<void> {
    try {
      const appType = await ApplicationType.create({
        tenant_id: req.user!.tenant_id,
        name: req.body.name,
        vertical: req.body.vertical,
        custom_fields_schema: req.body.custom_fields_schema || {},
      });
      res.status(201).json(appType);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateApplicationType(req: AuthRequest, res: Response): Promise<void> {
    try {
      await ApplicationType.update(req.body, { where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      const appType = await ApplicationType.findByPk(req.params.id);
      res.json(appType);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteApplicationType(req: AuthRequest, res: Response): Promise<void> {
    try {
      await ApplicationType.destroy({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      res.json({ message: 'Application type deleted.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getScoringProfiles(req: AuthRequest, res: Response): Promise<void> {
    try {
      const profiles = await ScoringProfile.findAll({ where: { tenant_id: req.user!.tenant_id } });
      res.json(profiles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPhoneConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cfg = await TenantPhoneConfig.findOne({ where: { tenant_id: req.user!.tenant_id } });
      if (!cfg) {
        // Return defaults without inserting — user will save via PUT when ready
        return res.json({
          tenant_id: req.user!.tenant_id,
          twilio_account_sid: '',
          twilio_auth_token: '',
          twilio_phone_number: '',
          whatsapp_phone_number: '',
          voice_enabled: false,
          whatsapp_enabled: false,
          call_recording_enabled: false,
          call_window_start: '09:00',
          call_window_end: '18:00',
          max_call_attempts_before_fail: 6,
          sla_warm_contact_hours: 24,
        }) as any;
      }
      const plain = cfg.toJSON() as any;
      if (plain.twilio_auth_token) {
        plain.twilio_auth_token = '••••••••' + plain.twilio_auth_token.slice(-4);
      }
      res.json(plain);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async savePhoneConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenant_id;
      const allowed = [
        'twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number', 'whatsapp_phone_number',
        'voice_enabled', 'whatsapp_enabled', 'call_recording_enabled',
        'call_window_start', 'call_window_end', 'max_call_attempts_before_fail', 'sla_warm_contact_hours',
      ];
      const data: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      // Don't overwrite token if the masked placeholder is submitted back
      if (data.twilio_auth_token?.startsWith('••••••••')) delete data.twilio_auth_token;

      let cfg = await TenantPhoneConfig.findOne({ where: { tenant_id: tenantId } });
      if (!cfg) {
        cfg = await TenantPhoneConfig.create({ tenant_id: tenantId, ...data });
      } else {
        await cfg.update(data);
      }
      res.json(cfg);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateScoringProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      let profile = await ScoringProfile.findOne({ where: { tenant_id: req.user!.tenant_id, is_active: true } });
      if (profile) {
        await ScoringProfile.update(
          { event_weights: req.body.event_weights, type_thresholds: req.body.type_thresholds, version: profile.version + 1 },
          { where: { id: profile.id } }
        );
        profile = await ScoringProfile.findByPk(profile.id);
      } else {
        profile = await ScoringProfile.create({
          tenant_id: req.user!.tenant_id,
          name: 'Default Profile',
          event_weights: req.body.event_weights,
          type_thresholds: req.body.type_thresholds,
        });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
