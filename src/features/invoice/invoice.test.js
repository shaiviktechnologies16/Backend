import test from "node:test";
import assert from "node:assert/strict";
import { PdfInvoiceGenerator } from "./infrastructure/pdf-invoice.generator.js";

test("PdfInvoiceGenerator generates valid PDF buffer with Shaivik Technologies styling", async () => {
  const generator = new PdfInvoiceGenerator();
  const pdfBuffer = await generator.generateInvoicePdfBuffer({
    invoiceNumber: "INV-20260908-0001",
    invoiceDateStr: "08 Sep 2026",
    paymentDateStr: "08 Sep 2026",
    paymentMethod: "Razorpay",
    transactionId: "pay_3P9xY7Z2a1bC",
    invoiceStatus: "Paid",
    customerName: "Rakesh",
    customerEmail: "rakesh@example.com",
    billingAddress: "India",
    planName: "Starter Plan",
    planDescription: "Small businesses starting with AI",
    billingPeriodStr: "08 Sep 2026 – 08 Oct 2026",
    billingIntervalLabel: "1 Month",
    unitPriceStr: "199.00",
    subtotalStr: "199.00",
    discountStr: "0.00",
    totalPaidStr: "199.00",
    currencySymbol: "₹",
    featuresList: [
      "2 Projects",
      "2 AI Agents",
      "4 Knowledge Bases",
      "3 Team Members",
      "1 WhatsApp Link",
      "5000 AI Credits / month",
    ],
    subscriptionPeriodStr: "08 Sep 2026 – 08 Oct 2026",
  });

  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.length > 1000);
  assert.equal(pdfBuffer.slice(0, 4).toString(), "%PDF");
});

test("InvoiceService generates invoice accurately with exact total paid from payment order", async () => {
  const { InvoiceService } =
    await import("./application/services/invoice.service.js");

  const fakeInvoice = {
    id: "inv-uuid-123",
    invoice_number: "INV-20260908-001",
    organization_id: "org-123",
    payment_order_id: "po-123",
    total_paid: "1347.00",
  };

  let generatedPdfData = null;
  const mockDataSource = {
    query: async (sql, params) => {
      if (sql.includes("FROM payment_orders")) {
        return [
          {
            id: "po-123",
            organization_id: "org-123",
            plan_id: "plan-starter-id",
            billing_interval: "QUARTERLY",
            amount: 134700, // ₹1,347.00 in paise
            razorpay_order_id: "order_123",
            razorpay_payment_id: "pay_123",
            status: "PAID",
            created_at: new Date(),
          },
        ];
      }
      if (sql.includes("FROM invoices WHERE organization_id")) {
        return []; // No existing invoice initially
      }
      if (sql.includes("FROM organizations")) {
        return [
          {
            id: "org-123",
            name: "Shaivik Tech",
            slug: "shaivik",
            p_id: "plan-starter-id",
            p_name: "Starter",
            p_code: "STARTER",
            p_description: "Starter Plan",
            price_monthly: 499,
            price_yearly: 4990,
            currency: "INR",
          },
        ];
      }
      if (sql.includes("FROM subscriptions")) {
        return [
          {
            id: "sub-123",
            current_period_start: new Date("2026-09-08"),
            current_period_end: new Date("2026-12-08"),
          },
        ];
      }
      if (sql.includes("organization_members")) {
        return [
          {
            name: "Rakesh",
            email: "rakesh@shaivik.in",
            phone: "9010510476",
            role: "OWNER",
          },
        ];
      }
      if (sql.includes("plan_usage_limits")) {
        return [
          {
            max_projects: 5,
            max_agents: 5,
            max_knowledge_bases: 5,
            max_team_members: 5,
            max_whatsapp_connections: 1,
            monthly_ai_credits: 5000,
          },
        ];
      }
      if (sql.includes("invoice_number_seq")) {
        return [{ seq: "1" }];
      }
      if (sql.includes("INSERT INTO invoices")) {
        return [fakeInvoice];
      }
      return [];
    },
  };

  const mockPdfGenerator = {
    generateInvoicePdfBuffer: async (pdfData) => {
      generatedPdfData = pdfData;
      return Buffer.from("%PDF-1.4 Fake PDF Content");
    },
  };

  const service = new InvoiceService({
    dataSource: mockDataSource,
    pdfInvoiceGenerator: mockPdfGenerator,
  });

  const invoice = await service.generateAndDeliverInvoice({
    organizationId: "org-123",
    paymentOrderId: "po-123",
    planId: "plan-starter-id",
    billingInterval: "QUARTERLY",
  });

  assert.equal(invoice.invoice_number, "INV-20260908-001");
  assert.equal(generatedPdfData.totalPaidStr, "1347.00");
  assert.equal(generatedPdfData.billingIntervalLabel, "3 Months");
  assert.equal(generatedPdfData.planName, "Starter Plan");
});

test("InvoiceService enforces idempotency on duplicate payment calls", async () => {
  const { InvoiceService } =
    await import("./application/services/invoice.service.js");

  const existingInv = {
    id: "inv-existing-99",
    invoice_number: "INV-20260908-099",
    organization_id: "org-123",
    payment_order_id: "po-dup-123",
    pdf_path: "/uploads/INVOICES/INV-20260908-099.pdf",
    whatsapp_delivery_status: "SENT",
  };

  let insertCount = 0;
  const mockDataSource = {
    query: async (sql, params) => {
      if (sql.includes("FROM payment_orders")) {
        return [
          {
            id: "po-dup-123",
            organization_id: "org-123",
            amount: 149900,
            status: "PAID",
          },
        ];
      }
      if (sql.includes("FROM invoices")) {
        return [existingInv];
      }
      if (sql.includes("INSERT INTO invoices")) {
        insertCount++;
        return [existingInv];
      }
      return [];
    },
  };

  const service = new InvoiceService({
    dataSource: mockDataSource,
    pdfInvoiceGenerator: {
      generateInvoicePdfBuffer: async () => Buffer.from("%PDF-1.4 Mock"),
    },
  });

  const invoice = await service.generateAndDeliverInvoice({
    organizationId: "org-123",
    paymentOrderId: "po-dup-123",
  });

  assert.equal(invoice.invoice_number, "INV-20260908-099");
  assert.equal(
    insertCount,
    0,
    "Must not insert duplicate invoice into database",
  );
});
