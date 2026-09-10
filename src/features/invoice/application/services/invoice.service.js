import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class InvoiceService {
  constructor({
    dataSource,
    pdfInvoiceGenerator,
    evolutionWhatsappProvider,
    whatsappConnectionRepository,
  }) {
    this.dataSource = dataSource;
    this.pdfInvoiceGenerator = pdfInvoiceGenerator;
    this.evolutionWhatsappProvider = evolutionWhatsappProvider;
    this.whatsappConnectionRepository = whatsappConnectionRepository;

    this.invoicesDir = path.join(__dirname, "../../../../../uploads/INVOICES");
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  formatDate(dateObj) {
    if (!dateObj) return "N/A";
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return "N/A";

    const day = String(d.getDate()).padStart(2, "0");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  async resolveOrganizationCustomer(organizationId) {
    if (!organizationId) {
      return { name: "Valued Customer", email: "", phone: null };
    }

    // 1. Primary Owner or Admin member with phone number
    const memberWithPhone = await this.dataSource.query(
      `SELECT u.name, u.email, u.phone, om.role
       FROM organization_members om
       INNER JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 
         AND u.phone IS NOT NULL AND TRIM(u.phone) != ''
       ORDER BY CASE WHEN om.role = 'OWNER' THEN 1 WHEN om.role = 'ADMIN' THEN 2 ELSE 3 END, om.created_at ASC 
       LIMIT 1`,
      [organizationId],
    );

    // 2. Primary Owner/Admin member (for name & email fallback)
    const primaryMember = await this.dataSource.query(
      `SELECT u.name, u.email, u.phone, om.role
       FROM organization_members om
       INNER JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.role IN ('OWNER', 'ADMIN')
       ORDER BY CASE WHEN om.role = 'OWNER' THEN 1 ELSE 2 END, om.created_at ASC 
       LIMIT 1`,
      [organizationId],
    );

    // 3. Company Profile (optional)
    let profile = {};
    try {
      const profileRes = await this.dataSource.query(
        `SELECT phone, alternate_phone, email FROM company_profiles WHERE organization_id = $1 LIMIT 1`,
        [organizationId],
      );
      profile = profileRes[0] || {};
    } catch (_err) {
      // Ignore if company_profiles table doesn't exist
    }

    // 4. Notification Recipient Phone (optional)
    let notifRecipient = {};
    try {
      const notificationRes = await this.dataSource.query(
        `SELECT recipient_phone_number FROM enquiry_notification_recipients WHERE organization_id = $1 AND recipient_phone_number IS NOT NULL AND TRIM(recipient_phone_number) != '' LIMIT 1`,
        [organizationId],
      );
      notifRecipient = notificationRes[0] || {};
    } catch (_err) {
      // Ignore if enquiry_notification_recipients table doesn't exist
    }

    const primaryUser = primaryMember[0] || {};
    const phoneUser = memberWithPhone[0] || {};

    const resolvedPhone =
      phoneUser.phone ||
      primaryUser.phone ||
      profile.phone ||
      profile.alternate_phone ||
      notifRecipient.recipient_phone_number ||
      null;

    return {
      name: phoneUser.name || primaryUser.name || "Valued Customer",
      email: primaryUser.email || profile.email || "",
      phone: resolvedPhone,
    };
  }

  async regeneratePdfForInvoice(invoiceRecord) {
    const orgRes = await this.dataSource.query(
      `SELECT o.*, p.id AS p_id, p.name AS p_name, p.code AS p_code, p.description AS p_description, p.price_monthly, p.price_yearly, p.currency
       FROM organizations o
       LEFT JOIN plans p ON p.id = COALESCE($1::uuid, o.plan_id)
       WHERE o.id = $2 LIMIT 1`,
      [invoiceRecord.plan_id, invoiceRecord.organization_id],
    );
    const orgRow = orgRes[0] || {};
    const limitsRes = await this.dataSource.query(
      `SELECT * FROM plan_usage_limits WHERE plan_id = $1 LIMIT 1`,
      [orgRow.p_id || invoiceRecord.plan_id],
    );
    const limits = limitsRes[0] || {};
    const featuresList = [
      `${limits.max_projects ?? "Unlimited"} Projects`,
      `${limits.max_agents ?? "Unlimited"} AI Agents`,
      `${limits.max_knowledge_bases ?? "Unlimited"} Knowledge Bases`,
      `${limits.max_team_members ?? "Unlimited"} Team Members`,
      `${limits.max_whatsapp_connections ?? 0} WhatsApp Links`,
      `${limits.monthly_ai_credits ?? 0} AI Credits / month`,
    ];

    const currencySymbol =
      invoiceRecord.currency === "USD"
        ? "$"
        : invoiceRecord.currency === "EUR"
          ? "€"
          : "₹";
    const startDateStr = this.formatDate(
      invoiceRecord.subscription_start_date || invoiceRecord.payment_date,
    );
    const endDateStr = this.formatDate(
      invoiceRecord.subscription_end_date ||
        Date.now() + 30 * 24 * 60 * 60 * 1000,
    );
    const paymentDateStr = this.formatDate(invoiceRecord.payment_date);
    const totalPaid = Number(invoiceRecord.total_paid || 0);

    const intervalUpper = String(
      invoiceRecord.billing_interval || "MONTHLY",
    ).toUpperCase();
    const billingIntervalLabel =
      intervalUpper === "QUARTERLY" ||
      intervalUpper === "3_MONTHS" ||
      intervalUpper === "3 MONTHS"
        ? "3 Months"
        : intervalUpper === "YEARLY" ||
            intervalUpper === "ANNUAL" ||
            intervalUpper === "12_MONTHS" ||
            intervalUpper === "12 MONTHS"
          ? "1 Year"
          : "1 Month";

    const pdfData = {
      invoiceNumber: invoiceRecord.invoice_number,
      invoiceDateStr: paymentDateStr,
      paymentDateStr,
      paymentMethod: invoiceRecord.razorpay_payment_id
        ? "Razorpay"
        : "Online Payment",
      transactionId:
        invoiceRecord.razorpay_payment_id ||
        invoiceRecord.razorpay_order_id ||
        `TXN-${Date.now()}`,
      invoiceStatus: "Paid",
      customerName: invoiceRecord.customer_name || orgRow.name,
      customerEmail: invoiceRecord.customer_email,
      billingAddress: invoiceRecord.billing_address,
      planName: `${orgRow.p_name || "Starter"} Plan`,
      planDescription:
        orgRow.p_description || "Essential AI capabilities for your team",
      billingPeriodStr: `${startDateStr} – ${endDateStr}`,
      billingIntervalLabel,
      unitPriceStr: totalPaid.toFixed(2),
      subtotalStr: Number(invoiceRecord.subtotal || totalPaid).toFixed(2),
      discountStr: Number(invoiceRecord.discount || 0).toFixed(2),
      totalPaidStr: totalPaid.toFixed(2),
      currencySymbol,
      featuresList,
      subscriptionPeriodStr: `${startDateStr} – ${endDateStr}`,
    };

    const pdfBuffer =
      await this.pdfInvoiceGenerator.generateInvoicePdfBuffer(pdfData);
    const pdfFileName = `${invoiceRecord.invoice_number}.pdf`;
    const pdfPath = path.join(this.invoicesDir, pdfFileName);
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(
      `[REGENERATED PDF] Invoice ${invoiceRecord.invoice_number} saved to ${pdfPath}`,
    );
    return pdfBuffer;
  }

  async generateAndDeliverInvoice({
    organizationId,
    paymentOrderId = null,
    razorpayOrderId = null,
    razorpayPaymentId = null,
    planId = null,
    billingInterval = "MONTHLY",
  }) {
    if (!organizationId) {
      throw new Error("Organization ID is required for invoice generation.");
    }

    console.log(
      `[INVOICE WORKFLOW START] orgId: ${organizationId}, planId: ${planId}, billingInterval: ${billingInterval}, paymentOrderId: ${paymentOrderId}, razorpayPaymentId: ${razorpayPaymentId}`,
    );

    // 1. Fetch Payment Order record if ID/Razorpay IDs provided or query latest PAID payment order
    let paymentOrderRow = null;
    if (paymentOrderId || razorpayOrderId || razorpayPaymentId) {
      const poRes = await this.dataSource.query(
        `SELECT * FROM payment_orders 
         WHERE (id = $1::uuid OR (razorpay_order_id = $2 AND $2 IS NOT NULL) OR (razorpay_payment_id = $3 AND $3 IS NOT NULL))
         LIMIT 1`,
        [paymentOrderId, razorpayOrderId, razorpayPaymentId],
      );
      paymentOrderRow = poRes[0] || null;
    }

    if (!paymentOrderRow && organizationId) {
      const poRes = await this.dataSource.query(
        `SELECT * FROM payment_orders 
         WHERE organization_id = $1 
           AND (plan_id = $2 OR $2::uuid IS NULL)
           AND status = 'PAID'
         ORDER BY updated_at DESC
         LIMIT 1`,
        [organizationId, planId],
      );
      paymentOrderRow = poRes[0] || null;
    }

    if (paymentOrderRow) {
      paymentOrderId = paymentOrderRow.id || paymentOrderId;
      razorpayOrderId = paymentOrderRow.razorpay_order_id || razorpayOrderId;
      razorpayPaymentId =
        paymentOrderRow.razorpay_payment_id || razorpayPaymentId;
      planId = paymentOrderRow.plan_id || planId;
      billingInterval = paymentOrderRow.billing_interval || billingInterval;
    }

    // 2. Idempotency Check: Do not generate duplicate invoice for the same payment
    const existingRes = await this.dataSource.query(
      `SELECT * FROM invoices 
       WHERE organization_id = $1 
         AND (
           ($2::varchar IS NOT NULL AND razorpay_payment_id = $2) OR 
           ($3::varchar IS NOT NULL AND razorpay_order_id = $3) OR
           ($4::uuid IS NOT NULL AND payment_order_id = $4)
         )
       LIMIT 1`,
      [organizationId, razorpayPaymentId, razorpayOrderId, paymentOrderId],
    );

    if (existingRes.length > 0) {
      const existingInv = existingRes[0];
      console.log(
        `[INVOICE SERVICE] Existing invoice found for payment: ${existingInv.invoice_number}. Skipping duplicate generation.`,
      );

      // Verify PDF file exists on disk, re-create if missing
      if (existingInv.pdf_path) {
        const fullPdfPath = path.resolve(
          process.cwd(),
          existingInv.pdf_path.replace(/^\//, ""),
        );
        if (!fs.existsSync(fullPdfPath)) {
          console.log(
            `[INVOICE SERVICE] PDF file missing at ${fullPdfPath}. Re-rendering PDF for invoice ${existingInv.invoice_number}...`,
          );
          await this.regeneratePdfForInvoice(existingInv);
        }
      }

      return existingInv;
    }

    // 3. Fetch Subscription & Organization details
    const orgRes = await this.dataSource.query(
      `SELECT o.*, p.id AS p_id, p.name AS p_name, p.code AS p_code, p.description AS p_description, p.price_monthly, p.price_yearly, p.currency
       FROM organizations o
       LEFT JOIN plans p ON p.id = COALESCE($1::uuid, o.plan_id)
       WHERE o.id = $2 LIMIT 1`,
      [planId, organizationId],
    );

    const orgRow = orgRes[0];
    if (!orgRow) {
      throw new Error(`Organization ${organizationId} not found.`);
    }

    // Restrict invoice generation for FREE plans without a paid payment order
    if (
      (orgRow.p_code === "FREE" || orgRow.code === "FREE") &&
      !paymentOrderRow
    ) {
      console.log(
        `[INVOICE SERVICE] Free plan without payment order. Skipping invoice creation.`,
      );
      return null;
    }

    const subRes = await this.dataSource.query(
      `SELECT * FROM subscriptions WHERE organization_id = $1 LIMIT 1`,
      [organizationId],
    );
    const subRow = subRes[0] || {};

    // 4. Fetch Customer / User details
    const customer = await this.resolveOrganizationCustomer(organizationId);
    if (!customer.name || customer.name === "Valued Customer") {
      customer.name = orgRow.name;
    }
    if (!customer.email) {
      customer.email = "billing@" + (orgRow.slug || "workspace") + ".com";
    }

    // 5. Fetch Plan Capacities / Usage Limits
    const limitsRes = await this.dataSource.query(
      `SELECT * FROM plan_usage_limits WHERE plan_id = $1 LIMIT 1`,
      [orgRow.p_id || planId],
    );
    const limits = limitsRes[0] || {};

    const featuresList = [
      `${limits.max_projects ?? "Unlimited"} Projects`,
      `${limits.max_agents ?? "Unlimited"} AI Agents`,
      `${limits.max_knowledge_bases ?? "Unlimited"} Knowledge Bases`,
      `${limits.max_team_members ?? "Unlimited"} Team Members`,
      `${limits.max_whatsapp_connections ?? 0} WhatsApp Links`,
      `${limits.monthly_ai_credits ?? 0} AI Credits / month`,
    ];

    // 6. Calculate Order Amounts
    let totalPaid = 0;
    if (paymentOrderRow && paymentOrderRow.amount != null) {
      totalPaid = Number(paymentOrderRow.amount) / 100;
    } else {
      let unitPrice = Number(orgRow.price_monthly ?? 0);
      const intervalUpper = String(billingInterval || "MONTHLY").toUpperCase();
      if (
        intervalUpper === "YEARLY" ||
        intervalUpper === "ANNUAL" ||
        intervalUpper === "12_MONTHS"
      ) {
        unitPrice =
          Number(orgRow.price_yearly ?? 0) || Math.round(unitPrice * 12 * 0.8);
      } else if (
        intervalUpper === "QUARTERLY" ||
        intervalUpper === "3_MONTHS"
      ) {
        unitPrice = Math.round(unitPrice * 3 * 0.9);
      }
      totalPaid = unitPrice;
    }

    const subtotal = totalPaid;
    const unitPrice = totalPaid;
    const discount = 0;
    const tax = 0;
    const currency = orgRow.currency || "INR";
    const currencySymbol =
      currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";

    // 7. Generate Globally Sequential Invoice Number
    const today = new Date();

    const dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");

    const seqRes = await this.dataSource.query(
      `SELECT nextval('invoice_number_seq') AS seq`,
    );

    const seq = Number(seqRes[0].seq).toString().padStart(3, "0");

    const invoiceNumber = `INV-${dateStr}-${seq}`;

    // Dates
    const paymentDate = paymentOrderRow?.created_at
      ? new Date(paymentOrderRow.created_at)
      : new Date();
    const startDate = subRow.current_period_start
      ? new Date(subRow.current_period_start)
      : new Date();
    const endDate = subRow.current_period_end
      ? new Date(subRow.current_period_end)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoiceDateStr = this.formatDate(paymentDate);
    const paymentDateStr = this.formatDate(paymentDate);
    const startDateStr = this.formatDate(startDate);
    const endDateStr = this.formatDate(endDate);

    const intervalUpper = String(billingInterval || "MONTHLY").toUpperCase();
    const billingIntervalLabel =
      intervalUpper === "QUARTERLY" ||
      intervalUpper === "3_MONTHS" ||
      intervalUpper === "3 MONTHS"
        ? "3 Months"
        : intervalUpper === "YEARLY" ||
            intervalUpper === "ANNUAL" ||
            intervalUpper === "12_MONTHS" ||
            intervalUpper === "12 MONTHS"
          ? "1 Year"
          : "1 Month";

    // 8. Render PDF Invoice
    const pdfData = {
      invoiceNumber,
      invoiceDateStr,
      paymentDateStr,
      paymentMethod: razorpayPaymentId ? "Razorpay" : "Online Payment",
      transactionId:
        razorpayPaymentId || razorpayOrderId || `TXN-${Date.now()}`,
      invoiceStatus: "Paid",
      customerName: customer.name || orgRow.name,
      customerEmail: customer.email,
      billingAddress: customer.billingAddress,
      planName: `${orgRow.p_name || "Starter"} Plan`,
      planDescription:
        orgRow.p_description || "Essential AI capabilities for your team",
      billingPeriodStr: `${startDateStr} – ${endDateStr}`,
      billingIntervalLabel,
      unitPriceStr: unitPrice.toFixed(2),
      subtotalStr: subtotal.toFixed(2),
      discountStr: discount.toFixed(2),
      totalPaidStr: totalPaid.toFixed(2),
      currencySymbol,
      featuresList,
      subscriptionPeriodStr: `${startDateStr} – ${endDateStr}`,
    };

    const pdfBuffer =
      await this.pdfInvoiceGenerator.generateInvoicePdfBuffer(pdfData);
    const pdfFileName = `${invoiceNumber}.pdf`;
    const pdfPath = path.join(this.invoicesDir, pdfFileName);
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`[PDF GENERATED] Invoice ${invoiceNumber} saved to ${pdfPath}`);

    // 9. Insert Invoice Record into Database
    const insertRes = await this.dataSource.query(
      `INSERT INTO invoices (
        invoice_number, organization_id, payment_order_id, subscription_id, plan_id,
        customer_name, customer_email, billing_address, billing_interval,
        subtotal, discount, tax, total_paid, currency, status, pdf_path,
        payment_date, subscription_start_date, subscription_end_date,
        razorpay_order_id, razorpay_payment_id, whatsapp_delivery_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        invoiceNumber,
        organizationId,
        paymentOrderId,
        subRow.id || null,
        orgRow.p_id || planId,
        pdfData.customerName,
        pdfData.customerEmail,
        pdfData.billingAddress,
        billingInterval,
        subtotal,
        discount,
        tax,
        totalPaid,
        currency,
        "GENERATED",
        `/uploads/INVOICES/${pdfFileName}`,
        paymentDate,
        startDate,
        endDate,
        razorpayOrderId,
        razorpayPaymentId,
        "PENDING",
      ],
    );

    const invoiceRecord = insertRes[0];
    console.log(
      `[INVOICE CREATED] Record ID: ${invoiceRecord.id}, Number: ${invoiceNumber}`,
    );

    // 10. Deliver Invoice PDF via WhatsApp (Non-blocking background delivery)
    this.deliverInvoiceToWhatsapp({
      invoiceRecord,
      organizationId,
      customer,
      pdfBuffer,
      pdfFileName,
      invoiceNumber,
      planName: orgRow.p_name || "Starter",
      totalPaidStr: `${currencySymbol}${totalPaid.toFixed(2)}`,
      subscriptionPeriodStr: `${startDateStr} – ${endDateStr}`,
    }).catch((err) => {
      console.error(
        "[INVOICE WHATSAPP DELIVERY BACKGROUND ERROR]",
        err.message,
      );
    });

    return invoiceRecord;
  }

  async deliverInvoiceToWhatsapp({
    invoiceRecord,
    organizationId,
    customer,
    pdfBuffer,
    pdfFileName,
    invoiceNumber,
    planName,
    totalPaidStr,
    subscriptionPeriodStr,
  }) {
    try {
      if (
        !this.whatsappConnectionRepository ||
        !this.evolutionWhatsappProvider
      ) {
        console.log(
          "[INVOICE WHATSAPP] WhatsApp repository or provider not injected. Skipping WhatsApp delivery.",
        );
        return;
      }

      // Gather candidate connected Evolution WhatsApp connections ordered by priority
      const candidateConnections = [];

      // Priority 1: Connected Evolution connection for this organization
      const orgConn =
        await this.whatsappConnectionRepository.findConnectedEvolutionByOrganizationId(
          organizationId,
        );
      if (orgConn) {
        orgConn._tableName = "whatsapp_connections";
        candidateConnections.push(orgConn);
      }

      // Priority 2: Any connected Evolution connection across workspace organizations
      const globalConn =
        await this.whatsappConnectionRepository.findConnectedEvolution();
      if (
        globalConn &&
        !candidateConnections.some((c) => c.id === globalConn.id)
      ) {
        globalConn._tableName = "whatsapp_connections";
        candidateConnections.push(globalConn);
      }

      // Priority 3: Connected platform-level WhatsApp connections
      const platRows = await this.dataSource.query(
        `SELECT * FROM platform_whatsapp_connections 
         WHERE provider = 'EVOLUTION' AND status = 'CONNECTED' 
         ORDER BY updated_at DESC`,
      );
      for (const row of platRows) {
        const domainObj = this.whatsappConnectionRepository.toDomain(row);
        if (
          domainObj &&
          !candidateConnections.some((c) => c.id === domainObj.id)
        ) {
          domainObj._tableName = "platform_whatsapp_connections";
          candidateConnections.push(domainObj);
        }
      }

      // Priority 4: Any connected whatsapp_connections in DB
      const connRows = await this.dataSource.query(
        `SELECT * FROM whatsapp_connections 
         WHERE provider = 'EVOLUTION' AND status = 'CONNECTED' 
         ORDER BY updated_at DESC`,
      );
      for (const row of connRows) {
        const domainObj = this.whatsappConnectionRepository.toDomain(row);
        if (
          domainObj &&
          !candidateConnections.some((c) => c.id === domainObj.id)
        ) {
          domainObj._tableName = "whatsapp_connections";
          candidateConnections.push(domainObj);
        }
      }

      // Priority 5: Live instance discovery directly from Evolution API
      try {
        if (
          typeof this.evolutionWhatsappProvider?.fetchInstances === "function"
        ) {
          const liveInstances =
            await this.evolutionWhatsappProvider.fetchInstances();
          if (Array.isArray(liveInstances)) {
            for (const liveInst of liveInstances) {
              const instName = liveInst.name || liveInst.instanceName;
              if (
                instName &&
                !candidateConnections.some(
                  (c) => c.metadata?.evolution?.instanceName === instName,
                )
              ) {
                candidateConnections.push({
                  id: liveInst.id || `live-${instName}`,
                  name: instName,
                  status:
                    liveInst.connectionStatus === "open"
                      ? "CONNECTED"
                      : "DISCONNECTED",
                  provider: "EVOLUTION",
                  phoneNumber: liveInst.ownerJid
                    ? liveInst.ownerJid.split("@")[0]
                    : null,
                  metadata: { evolution: { instanceName: instName } },
                  _tableName: null,
                  _liveState: liveInst.connectionStatus,
                });
              }
            }
          }
        }
      } catch (liveErr) {
        console.warn(
          "[INVOICE WHATSAPP] Live Evolution instance fetch error:",
          liveErr.message,
        );
      }

      let lastError = null;
      let sentSuccess = false;

      for (const connection of candidateConnections) {
        const instanceName = connection.metadata?.evolution?.instanceName;
        if (!instanceName) continue;

        let rawPhone = customer?.phone;
        if (!rawPhone && organizationId) {
          const resolved =
            await this.resolveOrganizationCustomer(organizationId);
          rawPhone = resolved.phone;
        }

        if (!rawPhone) {
          throw new Error(
            "Recipient phone number not found for organization. Please update Organization Owner user profile or Company Profile phone.",
          );
        }

        let recipientPhone = String(rawPhone).replace(/\D/g, "");
        if (recipientPhone.length === 10) {
          recipientPhone = "91" + recipientPhone;
        }

        if (recipientPhone.length < 10) {
          throw new Error(
            `Invalid recipient phone number format: '${rawPhone}'`,
          );
        }

        const captionText = `Payment received successfully.
        
Shaivik Technologies subscription invoice is attached.

Invoice: ${invoiceNumber}
Plan: ${planName}
Amount Paid: ${totalPaidStr}
Subscription: ${subscriptionPeriodStr}

Thank you for choosing Shaivik Technologies.`;

        const base64Pdf = pdfBuffer.toString("base64");

        console.log(
          `[INVOICE WHATSAPP] Sending invoice PDF ${invoiceNumber} to ${recipientPhone} via instance ${instanceName}...`,
        );

        try {
          const sendResult = await this.evolutionWhatsappProvider.sendMedia({
            instanceName,
            number: recipientPhone,
            media: base64Pdf,
            mediatype: "document",
            mimetype: "application/pdf",
            fileName: `Shaivik-Technologies-${invoiceNumber}.pdf`,
            caption: captionText,
          });

          const messageId =
            sendResult?.key?.id || sendResult?.id || `MSG-${Date.now()}`;

          await this.dataSource.query(
            `UPDATE invoices 
             SET whatsapp_connection_id = $1,
                 whatsapp_message_id = $2,
                 whatsapp_delivery_status = 'SENT',
                 whatsapp_delivery_error = NULL,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3`,
            [
              String(connection.id).startsWith("live-") ? null : connection.id,
              messageId,
              invoiceRecord.id,
            ],
          );

          console.log(
            `[INVOICE WHATSAPP SUCCESS] Invoice ${invoiceNumber} sent to WhatsApp! Message ID: ${messageId}`,
          );
          sentSuccess = true;
          break;
        } catch (err) {
          console.error(
            `[INVOICE WHATSAPP ERROR] Instance '${instanceName}' failed:`,
            err.message,
          );
          lastError = err;

          const statusVal = err.response?.status || err.status;
          const errMsg = JSON.stringify(err.response?.data || err.message);
          if (
            statusVal === 404 ||
            statusVal === 401 ||
            errMsg.includes("does not exist") ||
            errMsg.includes("Connection Failure") ||
            errMsg.includes("Connection Closed")
          ) {
            const targetTable =
              connection._tableName ||
              (connection.organizationId
                ? "whatsapp_connections"
                : "platform_whatsapp_connections");

            if (targetTable) {
              console.log(
                `[INVOICE WHATSAPP] Marking invalid connection ${connection.id} (${instanceName}) as DISCONNECTED in ${targetTable}.`,
              );
              await this.dataSource
                .query(
                  `UPDATE ${targetTable} SET status = 'DISCONNECTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                  [connection.id],
                )
                .catch(() => {});
            }
          }
        }
      }

      if (!sentSuccess) {
        let userFacingError =
          "No active connected WhatsApp instance found. Please connect WhatsApp in Workspace / Platform Settings.";
        if (lastError) {
          const statusVal = lastError.response?.status || lastError.status;
          const errMsg = String(lastError.message || "");
          const errDataStr = JSON.stringify(lastError.response?.data || "");

          if (
            statusVal === 404 ||
            errMsg.includes("404") ||
            errDataStr.includes("does not exist")
          ) {
            userFacingError =
              "WhatsApp instance does not exist on Evolution API server. Please create & scan QR in Workspace Settings.";
          } else if (
            statusVal === 401 ||
            errMsg.includes("401") ||
            errDataStr.includes("Connection Failure") ||
            errDataStr.includes("Connection Closed") ||
            errDataStr.includes("Unauthorized")
          ) {
            userFacingError =
              "WhatsApp instance session is disconnected. Please scan QR code in Workspace Settings.";
          } else {
            userFacingError = `WhatsApp delivery failed: ${lastError.message}`;
          }
        }

        console.error(
          `[INVOICE WHATSAPP FAILED] Invoice ${invoiceNumber} delivery failed: ${userFacingError}`,
        );

        await this.dataSource.query(
          `UPDATE invoices 
           SET whatsapp_delivery_status = 'FAILED',
               whatsapp_delivery_error = $1,
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [userFacingError, invoiceRecord.id],
        );
      }
    } catch (outerErr) {
      console.error(
        `[INVOICE WHATSAPP UNHANDLED ERROR] Invoice ${invoiceNumber}:`,
        outerErr.message,
      );
      await this.dataSource.query(
        `UPDATE invoices 
         SET whatsapp_delivery_status = 'FAILED',
             whatsapp_delivery_error = $1,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [outerErr.message, invoiceRecord.id],
      );
    }
  }

  async resendInvoiceToWhatsapp(invoiceId, organizationId) {
    const invoices = await this.dataSource.query(
      `SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [invoiceId, organizationId],
    );

    if (!invoices.length) {
      return { success: false, error: "Invoice record not found." };
    }

    const invoiceRecord = invoices[0];

    const fullPdfPath = path.resolve(
      process.cwd(),
      invoiceRecord.pdf_path.replace(/^\//, ""),
    );

    if (!fs.existsSync(fullPdfPath)) {
      return { success: false, error: "Invoice PDF file not found on server." };
    }

    const pdfBuffer = fs.readFileSync(fullPdfPath);
    const pdfFileName = `${invoiceRecord.invoice_number}.pdf`;

    const orgRes = await this.dataSource.query(
      `SELECT o.*, p.name AS p_name FROM organizations o LEFT JOIN plans p ON p.id = o.plan_id WHERE o.id = $1 LIMIT 1`,
      [organizationId],
    );

    const resolvedCustomer =
      await this.resolveOrganizationCustomer(organizationId);

    const customer = {
      name:
        invoiceRecord.customer_name ||
        resolvedCustomer.name ||
        orgRes[0]?.name ||
        "Customer",
      email: invoiceRecord.customer_email || resolvedCustomer.email || "",
      phone: resolvedCustomer.phone,
    };

    const currencySymbol = invoiceRecord.currency === "INR" ? "₹" : "$";
    const startDateStr = this.formatDate(
      new Date(
        invoiceRecord.subscription_start_date || invoiceRecord.payment_date,
      ),
    );
    const endDateStr = this.formatDate(
      new Date(
        invoiceRecord.subscription_end_date ||
          Date.now() + 30 * 24 * 60 * 60 * 1000,
      ),
    );

    await this.deliverInvoiceToWhatsapp({
      invoiceRecord,
      organizationId,
      customer,
      pdfBuffer,
      pdfFileName,
      invoiceNumber: invoiceRecord.invoice_number,
      planName: orgRes[0]?.p_name || "Starter",
      totalPaidStr: `${currencySymbol}${Number(invoiceRecord.total_paid).toFixed(2)}`,
      subscriptionPeriodStr: `${startDateStr} – ${endDateStr}`,
    });

    const updatedInvoices = await this.dataSource.query(
      `SELECT * FROM invoices WHERE id = $1 LIMIT 1`,
      [invoiceId],
    );

    const updated = updatedInvoices[0];
    if (updated.whatsapp_delivery_status === "SENT") {
      return { success: true, invoice: updated };
    } else {
      return {
        success: false,
        invoice: updated,
        error:
          updated.whatsapp_delivery_error ||
          "Failed to deliver invoice to WhatsApp.",
      };
    }
  }

  async getInvoicesByOrganizationId(organizationId) {
    return this.dataSource.query(
      `SELECT * FROM invoices WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId],
    );
  }

  async getInvoiceById(invoiceId, organizationId) {
    const res = await this.dataSource.query(
      `SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [invoiceId, organizationId],
    );
    return res[0] || null;
  }
}
