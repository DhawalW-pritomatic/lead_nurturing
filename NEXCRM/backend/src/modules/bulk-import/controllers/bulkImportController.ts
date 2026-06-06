import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { BulkImportService } from '../services/bulkImportService';

const bulkImportService = new BulkImportService();

export class BulkImportController {
  async importCSV(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'CSV file is required.' });
        return;
      }
      const result = await bulkImportService.importMultiTenantCSV(req.user!.id, req.file.path);
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async importCSVForTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'CSV file is required.' });
        return;
      }
      const result = await bulkImportService.importForTenant(req.user!.tenant_id, req.user!.id, req.file.path);
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }
}
