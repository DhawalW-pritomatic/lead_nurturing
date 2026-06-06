import fs from 'fs';
import csvParser from 'csv-parser';
import { Op } from 'sequelize';
import { Lead, Tenant } from '../../../database/models';
import { NotificationService } from '../../notifications/services/notificationService';
import { AppError } from '../../../middleware/errorHandler';

const notificationService = new NotificationService();

export class BulkImportService {
  /**
   * Multi-tenant CSV import: reads `tenant_subdomain` or `tenant_name` column
   * from CSV to determine which tenant each lead belongs to.
   * Only super_admin can use this endpoint.
   */
  async importMultiTenantCSV(userId: string, filePath: string): Promise<any> {
    const rows: any[] = [];
    const errors: any[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row: any) => {
          rows.push(row);
        })
        .on('end', async () => {
          try {
            // Group rows by tenant identifier
            const tenantGroups: Record<string, any[]> = {};
            const rowsWithoutTenant: any[] = [];

            for (const row of rows) {
              const tenantKey = row.tenant_subdomain?.trim() || row.tenant_name?.trim() || row.tenant?.trim();
              if (!tenantKey) {
                rowsWithoutTenant.push(row);
                errors.push({ row, error: 'Missing tenant identifier (tenant_subdomain or tenant_name column)' });
                continue;
              }
              if (!tenantGroups[tenantKey]) tenantGroups[tenantKey] = [];
              tenantGroups[tenantKey].push(row);
            }

            // Resolve tenant IDs
            const tenantKeys = Object.keys(tenantGroups);
            const tenants = await Tenant.findAll({
              where: {
                [Op.or]: [
                  { subdomain: { [Op.in]: tenantKeys } },
                  { name: { [Op.in]: tenantKeys } },
                ],
              },
            });

            const tenantMap = new Map<string, any>();
            for (const t of tenants) {
              tenantMap.set(t.subdomain, t);
              tenantMap.set(t.name, t);
            }

            let totalCreated = 0;
            let totalDuplicates = 0;
            const tenantResults: any[] = [];

            for (const [tenantKey, tenantRows] of Object.entries(tenantGroups)) {
              const tenant = tenantMap.get(tenantKey);
              if (!tenant) {
                for (const r of tenantRows) {
                  errors.push({ row: r, error: `Tenant "${tenantKey}" not found` });
                }
                continue;
              }

              const result = await this.processLeadsForTenant(tenant.id, userId, tenantRows, errors);
              totalCreated += result.created;
              totalDuplicates += result.duplicates;
              tenantResults.push({ tenant: tenant.name, subdomain: tenant.subdomain, ...result });

              // Send notification per tenant
              await notificationService.notifyBulkImportComplete(tenant.id, result.created, result.errors);
            }

            // Cleanup uploaded file
            fs.unlink(filePath, () => {});

            resolve({
              total_rows: rows.length,
              total_created: totalCreated,
              total_duplicates: totalDuplicates,
              total_errors: errors.length,
              tenant_results: tenantResults,
              error_details: errors.slice(0, 20),
            });
          } catch (err) {
            fs.unlink(filePath, () => {});
            reject(err);
          }
        })
        .on('error', (err: any) => {
          fs.unlink(filePath, () => {});
          reject(new AppError('Failed to parse CSV file.', 400));
        });
    });
  }

  /**
   * Single-tenant CSV import: all leads go to the given tenant.
   */
  async importForTenant(tenantId: string, userId: string, filePath: string): Promise<any> {
    const rows: any[] = [];
    const errors: any[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row: any) => {
          rows.push(row);
        })
        .on('end', async () => {
          try {
            const result = await this.processLeadsForTenant(tenantId, userId, rows, errors);

            // Send notification
            await notificationService.notifyBulkImportComplete(tenantId, result.created, result.errors, userId);

            // Cleanup uploaded file
            fs.unlink(filePath, () => {});

            resolve({
              total_in_file: rows.length,
              valid: result.valid,
              created: result.created,
              duplicates_skipped: result.duplicates,
              errors: errors.length,
              error_details: errors.slice(0, 10),
            });
          } catch (err) {
            fs.unlink(filePath, () => {});
            reject(err);
          }
        })
        .on('error', () => {
          fs.unlink(filePath, () => {});
          reject(new AppError('Failed to parse CSV file.', 400));
        });
    });
  }

  private async processLeadsForTenant(tenantId: string, userId: string, rows: any[], errors: any[]): Promise<any> {
    const leads: any[] = [];

    for (const row of rows) {
      const firstName = row.first_name?.trim();
      const lastName = row.last_name?.trim();
      const email = row.email?.trim()?.toLowerCase();

      if (!firstName || !lastName || !email) {
        errors.push({ row, error: 'Missing required fields (first_name, last_name, email)' });
        continue;
      }

      leads.push({
        tenant_id: tenantId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: row.phone?.trim(),
        company: row.company?.trim(),
        city: row.city?.trim(),
        source: row.source?.trim() || 'CSV Import',
        status: 'NEW',
        lead_type: 'COLD',
        score: 0,
        enrolled_by: userId,
        gdpr_consent: row.consent === 'true' || row.consent === 'yes' || row.gdpr_consent === 'true',
        custom_fields: {},
      });
    }

    // Remove duplicate emails within import
    const uniqueLeads = leads.filter((lead, index, self) =>
      index === self.findIndex(l => l.email === lead.email)
    );

    // Check against existing leads in this tenant
    const existingEmails = await Lead.findAll({
      where: { tenant_id: tenantId, email: { [Op.in]: uniqueLeads.map(l => l.email) } },
      attributes: ['email'],
    });
    const existingSet = new Set(existingEmails.map((l: any) => l.email));
    const newLeads = uniqueLeads.filter(l => !existingSet.has(l.email));
    const duplicates = uniqueLeads.filter(l => existingSet.has(l.email));

    let created = 0;
    if (newLeads.length > 0) {
      await Lead.bulkCreate(newLeads);
      created = newLeads.length;
    }

    return {
      valid: leads.length,
      created,
      duplicates: duplicates.length,
      errors: rows.length - leads.length,
    };
  }
}
