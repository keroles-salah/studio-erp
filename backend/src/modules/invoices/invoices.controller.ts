import { Request, Response, NextFunction } from 'express';
import { invoicesService } from './invoices.service';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  listInvoicesQuerySchema,
} from './invoices.dto';
import { AuthenticatedRequest } from '../auth/auth.middleware';

export class InvoicesController {
  // ─── GET / - List invoices with filters ────────────────────

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = listInvoicesQuerySchema.parse(req.query);
      const result = await invoicesService.list(parsed);

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: error.errors?.[0]?.message || 'Validation error',
          },
        });
        return;
      }
      next(error);
    }
  }

  // ─── GET /:id - Get invoice with items and payments ────────

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await invoicesService.getById(id);

      if (!invoice) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invoice not found' },
        });
        return;
      }

      res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  // ─── POST / - Create invoice ───────────────────────────────

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const parsed = createInvoiceSchema.parse(req.body);

      const invoice = await invoicesService.create(parsed, authReq.user!.id);

      res.status(201).json({ success: true, data: invoice });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: error.errors?.[0]?.message || 'Validation error',
          },
        });
        return;
      }
      next(error);
    }
  }

  // ─── PATCH /:id - Update invoice ───────────────────────────

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = updateInvoiceSchema.parse(req.body);

      const invoice = await invoicesService.update(id, parsed);

      if (!invoice) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invoice not found' },
        });
        return;
      }

      res.json({ success: true, data: invoice });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: error.errors?.[0]?.message || 'Validation error',
          },
        });
        return;
      }
      if (error?.status) {
        res.status(error.status).json({
          success: false,
          error: { code: error.code || 'BAD_REQUEST', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  // ─── GET /:id/pdf - PDF generation placeholder ─────────────

  async getPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await invoicesService.getById(id);

      if (!invoice) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invoice not found' },
        });
        return;
      }

      if (invoice.pdfPath) {
        // If a pre-generated PDF exists, return its path info
        res.json({
          success: true,
          data: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            pdfPath: invoice.pdfPath,
            generated: true,
          },
        });
        return;
      }

      // Placeholder: PDF generation not yet implemented
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'PDF generation is not yet implemented. The invoice data is available via GET /:id',
        },
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          pdfPath: null,
          generated: false,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── DELETE /:id - Soft delete invoice ─────────────────────

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await invoicesService.softDelete(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invoice not found' },
        });
        return;
      }

      res.json({ success: true, data: { id } });
    } catch (error: any) {
      if (error?.status) {
        res.status(error.status).json({
          success: false,
          error: { code: error.code || 'BAD_REQUEST', message: error.message },
        });
        return;
      }
      next(error);
    }
  }
}

export const invoicesController = new InvoicesController();
