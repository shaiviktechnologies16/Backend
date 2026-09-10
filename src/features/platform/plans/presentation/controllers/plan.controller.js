import fs from "fs";
import path from "path";

export class PlanController {
  constructor({
    createPlanUseCase,
    getPlanUseCase,
    getPlansUseCase,
    updatePlanUseCase,
    deletePlanUseCase,
    updatePlanUsageLimitUseCase,
    assignPlanToOrganizationUseCase,
    entitlementService,
    invoiceService,
  }) {
    this.createPlanUseCase = createPlanUseCase;
    this.getPlanUseCase = getPlanUseCase;
    this.getPlansUseCase = getPlansUseCase;
    this.updatePlanUseCase = updatePlanUseCase;
    this.deletePlanUseCase = deletePlanUseCase;
    this.updatePlanUsageLimitUseCase = updatePlanUsageLimitUseCase;
    this.assignPlanToOrganizationUseCase = assignPlanToOrganizationUseCase;
    this.entitlementService = entitlementService;
    this.invoiceService = invoiceService;
  }

  getPlans = async (req, res, next) => {
    try {
      const data = await this.getPlansUseCase.execute();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getPlan = async (req, res, next) => {
    try {
      const data = await this.getPlanUseCase.execute(req.params.id);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  createPlan = async (req, res, next) => {
    try {
      const data = await this.createPlanUseCase.execute(req.body);

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  updatePlan = async (req, res, next) => {
    try {
      const data = await this.updatePlanUseCase.execute(
        req.params.id,
        req.body,
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  deletePlan = async (req, res, next) => {
    try {
      const data = await this.deletePlanUseCase.execute(req.params.id);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  updateUsageLimit = async (req, res, next) => {
    try {
      const data = await this.updatePlanUsageLimitUseCase.execute(
        req.params.id,
        req.body,
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  assignPlanToOrganization = async (req, res, next) => {
    try {
      const data = await this.assignPlanToOrganizationUseCase.execute(
        req.params.organizationId,
        req.body.planId,
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getSubscription = async (req, res, next) => {
    try {
      const organizationId = req.params.organizationId;
      const data =
        await this.entitlementService.getEntitlements(organizationId);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  changeSubscription = async (req, res, next) => {
    try {
      const organizationId = req.params.organizationId;
      const {
        planId,
        targetPlanId,
        billingInterval,
        paymentOrderId,
        razorpayOrderId,
        razorpayPaymentId,
      } = req.body;
      const effectivePlanId = planId || targetPlanId;

      if (!effectivePlanId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PLAN_ID",
            message: "Plan ID is required.",
          },
        });
      }

      const data = await this.entitlementService.changeSubscription(
        organizationId,
        effectivePlanId,
        billingInterval,
      );

      // Trigger Invoice Generation & WhatsApp Delivery asynchronously for paid subscription changes
      if (this.invoiceService) {
        this.invoiceService
          .generateAndDeliverInvoice({
            organizationId,
            paymentOrderId,
            razorpayOrderId,
            razorpayPaymentId,
            planId: effectivePlanId,
            billingInterval,
          })
          .catch((err) => {
            console.error(
              "[INVOICE CHANGE SUBSCRIPTION BACKGROUND ERROR]",
              err.message,
            );
          });
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getInvoices = async (req, res, next) => {
    try {
      const organizationId = req.params.organizationId;
      if (!this.invoiceService) {
        return res.json({ success: true, data: [] });
      }

      const data =
        await this.invoiceService.getInvoicesByOrganizationId(organizationId);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  downloadInvoice = async (req, res, next) => {
    try {
      const { organizationId, invoiceId } = req.params;
      if (!this.invoiceService) {
        return res.status(404).json({
          success: false,
          error: {
            code: "INVOICE_NOT_FOUND",
            message: "Invoice service unavailable.",
          },
        });
      }

      const invoice = await this.invoiceService.getInvoiceById(
        invoiceId,
        organizationId,
      );

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: {
            code: "INVOICE_NOT_FOUND",
            message: "Invoice record not found for this organization.",
          },
        });
      }

      if (!invoice.pdf_path) {
        return res.status(404).json({
          success: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: "Invoice PDF path not recorded.",
          },
        });
      }

      const fullPath = path.resolve(
        process.cwd(),
        invoice.pdf_path.replace(/^\//, ""),
      );

      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({
          success: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: "Invoice PDF file not found on server.",
          },
        });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${invoice.invoice_number || "Invoice"}.pdf"`,
      );
      fs.createReadStream(fullPath).pipe(res);
    } catch (error) {
      next(error);
    }
  };

  resendInvoiceWhatsapp = async (req, res, next) => {
    try {
      const { organizationId, invoiceId } = req.params;
      if (!this.invoiceService) {
        return res.status(400).json({
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Invoice service unavailable.",
          },
        });
      }

      const result = await this.invoiceService.resendInvoiceToWhatsapp(
        invoiceId,
        organizationId,
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "WHATSAPP_DELIVERY_FAILED",
            message: result.error || "Failed to resend invoice to WhatsApp.",
          },
          data: result.invoice,
        });
      }

      res.json({
        success: true,
        data: result.invoice,
        message: "Invoice successfully sent to WhatsApp.",
      });
    } catch (error) {
      next(error);
    }
  };

  resetSubscriptionDev = async (req, res, next) => {
    try {
      const isDevEnv =
        process.env.NODE_ENV === "development" ||
        !process.env.NODE_ENV ||
        process.env.NODE_ENV !== "production";

      if (!isDevEnv) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN_IN_PRODUCTION",
            message:
              "Development subscription reset is only available in local development mode.",
          },
        });
      }

      const organizationId = req.params.organizationId;
      const result =
        await this.entitlementService.resetDevSubscription(organizationId);

      res.json({
        success: true,
        message: result.message,
        data: {
          plan: result.plan,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
