import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PdfInvoiceGenerator {
  constructor() {
    this.logoPath = path.join(__dirname, "../../../assets/shaivik-logo.png");
    this.signaturePath = path.join(__dirname, "../../../assets/signature.png");

    this.regularFontPath = path.join(
      __dirname,
      "../../../assets/fonts/NotoSans-Regular.ttf",
    );

    this.boldFontPath = path.join(
      __dirname,
      "../../../assets/fonts/NotoSans-Bold.ttf",
    );
  }

  formatAmount(val) {
    const num = Number(val || 0);
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  drawCheckmark(doc, x, y, size = 8, color = "#10B981") {
    doc.save();
    doc
      .strokeColor(color)
      .lineWidth(size * 0.2)
      .lineCap("round")
      .lineJoin("round");

    doc
      .moveTo(x, y + size * 0.4)
      .lineTo(x + size * 0.35, y + size * 0.75)
      .lineTo(x + size * 0.85, y + size * 0.15)
      .stroke();

    doc.restore();
  }

  generateInvoicePdfBuffer(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const buffers = [];

        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err) => reject(err));

        if (
          fs.existsSync(this.regularFontPath) &&
          fs.existsSync(this.boldFontPath)
        ) {
          doc.registerFont("NotoSans", this.regularFontPath);
          doc.registerFont("NotoSans-Bold", this.boldFontPath);
        }

        const fontRegular = fs.existsSync(this.regularFontPath)
          ? "NotoSans"
          : "Helvetica";
        const fontBold = fs.existsSync(this.boldFontPath)
          ? "NotoSans-Bold"
          : "Helvetica-Bold";

        const primaryColor = "#0F172A";
        const secondaryColor = "#475569";
        const brandBlue = "#2563EB";
        const lightBg = "#F8FAFC";
        const totalBoxBg = "#EFF6FF";
        const periodBoxBg = "#F0F9FF";
        const borderColor = "#E2E8F0";

        // --- 1. HEADER (LOGO LEFT, INVOICE RIGHT) ---
        if (fs.existsSync(this.logoPath)) {
          // Authoritative Shaivik Technologies logo (1024x526 aspect ratio)
          doc.image(this.logoPath, 36, 36, { width: 160 });
        } else {
          doc
            .fillColor(brandBlue)
            .fontSize(18)
            .font(fontBold)
            .text("SHAIVIK TECHNOLOGIES", 36, 40);
        }

        // Invoice Title & Number on Top Right
        doc
          .fillColor(primaryColor)
          .fontSize(24)
          .font(fontBold)
          .text("INVOICE", 380, 36, { align: "right" });

        doc
          .fillColor(secondaryColor)
          .fontSize(10)
          .font(fontRegular)
          .text(`#${data.invoiceNumber || "INV-0001"}`, 380, 66, {
            align: "right",
          });

        // Header Divider Line (below logo & header)
        doc
          .strokeColor(borderColor)
          .lineWidth(1)
          .moveTo(36, 128)
          .lineTo(559, 128)
          .stroke();

        // --- 2. COMPANY DETAILS (LEFT) & INVOICE METADATA (RIGHT) ---
        let currentY = 142;

        // Company Details (Left Column - BELOW Header Divider)
        doc
          .fillColor(primaryColor)
          .fontSize(11)
          .font(fontBold)
          .text("Shaivik Technologies", 36, currentY);

        doc
          .fillColor(secondaryColor)
          .fontSize(9)
          .font(fontRegular)
          .text("Plot 192 BDL, Hyderabad,", 36, currentY + 16)
          .text("Telangana, India", 36, currentY + 28)
          .text("shaiviktechnologies@gmail.com", 36, currentY + 40)
          .text("+91 7981742294", 36, currentY + 52);

        // Invoice Metadata (Right Column)
        const metaRightX = 350;
        const metaValueX = 445;
        const metaRows = [
          ["Invoice Date", ": " + (data.invoiceDateStr || "N/A")],
          ["Payment Date", ": " + (data.paymentDateStr || "N/A")],
          ["Payment Method", ": " + (data.paymentMethod || "Razorpay")],
          ["Transaction ID", ": " + (data.transactionId || "N/A")],
          ["Invoice Status", ": " + (data.invoiceStatus || "Paid")],
        ];

        metaRows.forEach(([label, val], idx) => {
          const rowY = currentY + idx * 15;
          doc
            .fillColor(secondaryColor)
            .fontSize(9)
            .font(fontRegular)
            .text(label, metaRightX, rowY);

          if (label === "Invoice Status") {
            doc.fillColor("#16A34A").font(fontBold).text(val, metaValueX, rowY);
          } else {
            doc
              .fillColor(primaryColor)
              .font(fontBold)
              .text(val, metaValueX, rowY);
          }
        });

        // --- 3. BILL TO CARD (LEFT COLUMN BELOW COMPANY DETAILS) ---
        currentY = 230;
        doc
          .roundedRect(36, currentY, 240, 72, 8)
          .fill(lightBg)
          .strokeColor(borderColor)
          .stroke();

        doc
          .fillColor(secondaryColor)
          .fontSize(8)
          .font(fontBold)
          .text("Bill To", 48, currentY + 10);

        doc
          .fillColor(primaryColor)
          .fontSize(11)
          .font(fontBold)
          .text(data.customerName || "Valued Customer", 48, currentY + 23);

        doc
          .fillColor(secondaryColor)
          .fontSize(9)
          .font(fontRegular)
          .text(data.customerEmail || "", 48, currentY + 38)
          .text(data.billingAddress || "India", 48, currentY + 52);

        // --- 4. ITEM TABLE ---
        currentY = 320;

        // Table Header Bar
        doc.roundedRect(36, currentY, 523, 24, 6).fill("#F1F5F9");

        doc
          .fillColor(secondaryColor)
          .fontSize(8)
          .font(fontBold)
          .text("#", 46, currentY + 8)
          .text("Description", 75, currentY + 8)
          .text("Billing Period", 220, currentY + 8)
          .text("Qty", 355, currentY + 8)
          .text("Unit Price", 400, currentY + 8, { width: 65, align: "right" })
          .text("Amount", 480, currentY + 8, { width: 75, align: "right" });

        // Table Data Row
        currentY += 32;
        doc
          .fillColor(primaryColor)
          .fontSize(10)
          .font(fontBold)
          .text("1", 46, currentY)
          .text(`${data.planName || "Starter Plan"}`, 75, currentY);

        doc
          .fillColor(secondaryColor)
          .fontSize(8)
          .font(fontRegular)
          .text(
            data.planDescription || "Essential AI capabilities",
            75,
            currentY + 14,
            { width: 135 },
          );

        doc
          .fillColor(primaryColor)
          .fontSize(9)
          .font(fontRegular)
          .text(data.billingPeriodStr || "", 220, currentY)
          .fillColor(secondaryColor)
          .fontSize(8)
          .text(
            `(${data.billingIntervalLabel || "1 Month"})`,
            220,
            currentY + 14,
          );

        // Qty
        doc
          .fillColor(primaryColor)
          .fontSize(9)
          .font(fontRegular)
          .text("1", 360, currentY);

        // Unit Price
        const unitPriceNum = this.formatAmount(data.unitPriceStr);
        doc
          .fillColor(primaryColor)
          .fontSize(9)
          .font(fontRegular)
          .text(`₹${unitPriceNum}`, 400, currentY, {
            width: 65,
            align: "right",
          });

        // Total Amount
        const totalAmountNum = this.formatAmount(data.totalPaidStr);
        doc
          .fillColor(primaryColor)
          .fontSize(9)
          .font(fontBold)
          .text(`₹${totalAmountNum}`, 480, currentY, {
            width: 75,
            align: "right",
          });

        // Underline Row
        doc
          .strokeColor(borderColor)
          .lineWidth(0.5)
          .moveTo(36, currentY + 34)
          .lineTo(559, currentY + 34)
          .stroke();

        // --- 5. PLAN FEATURES (LEFT) & TOTALS SUMMARY (RIGHT) ---
        currentY += 48;

        // Plan Features Section (Left)
        doc
          .fillColor(primaryColor)
          .fontSize(10)
          .font(fontBold)
          .text("Plan Features Included", 36, currentY);

        const features = data.featuresList || [
          "2 Projects",
          "2 AI Agents",
          "4 Knowledge Bases",
          "3 Team Members",
          "1 WhatsApp Link",
          "5000 AI Credits / month",
        ];

        features.forEach((feat, i) => {
          const featY = currentY + 18 + i * 15;
          this.drawCheckmark(doc, 36, featY + 1, 8, "#10B981");

          doc
            .fillColor(primaryColor)
            .fontSize(9)
            .font(fontRegular)
            .text(feat, 52, featY);
        });

        // Totals Summary Box (Right Column)
        const totalsX = 330;
        const totalValX = 440;
        const totalValWidth = 115;
        const totalStartY = currentY;

        // Subtotal
        doc
          .fillColor(secondaryColor)
          .fontSize(9)
          .font(fontRegular)
          .text("Subtotal", totalsX, totalStartY);
        const subtotalNum = this.formatAmount(
          data.subtotalStr || data.totalPaidStr,
        );
        doc
          .fillColor(primaryColor)
          .fontSize(9)
          .font(fontRegular)
          .text(`₹${subtotalNum}`, totalValX, totalStartY, {
            width: totalValWidth,
            align: "right",
          });

        // Discount
        doc
          .fillColor(secondaryColor)
          .fontSize(9)
          .font(fontRegular)
          .text("Discount", totalsX, totalStartY + 18);
        const discountNum = this.formatAmount(data.discountStr);
        doc
          .fillColor(primaryColor)
          .fontSize(9)
          .font(fontRegular)
          .text(`₹${discountNum}`, totalValX, totalStartY + 18, {
            width: totalValWidth,
            align: "right",
          });

        // Tax (0%)
        doc
          .fillColor(secondaryColor)
          .fontSize(9)
          .font(fontRegular)
          .text("Tax (0%)", totalsX, totalStartY + 36);
        doc
          .fillColor(primaryColor)
          .fontSize(9)
          .font(fontRegular)
          .text("₹0.00", totalValX, totalStartY + 36, {
            width: totalValWidth,
            align: "right",
          });

        // Shaded Total Paid Box
        const totalPaidBoxY = totalStartY + 56;
        doc
          .roundedRect(totalsX - 10, totalPaidBoxY, 239, 44, 8)
          .fill(totalBoxBg)
          .strokeColor("#BFDBFE")
          .stroke();

        doc
          .fillColor(brandBlue)
          .fontSize(12)
          .font(fontBold)
          .text("Total Paid", totalsX + 4, totalPaidBoxY + 14);

        // Native Text Rupee + Total Paid Amount
        const finalPaidNum = this.formatAmount(data.totalPaidStr);
        doc
          .fillColor(brandBlue)
          .fontSize(16)
          .font(fontBold)
          .text(`₹${finalPaidNum}`, totalsX + 70, totalPaidBoxY + 12, {
            width: 155,
            align: "right",
          });

        // --- 6. SUBSCRIPTION PERIOD BANNER ---
        currentY = 560;
        doc
          .roundedRect(36, currentY, 523, 55, 8)
          .fill(periodBoxBg)
          .strokeColor("#BAE6FD")
          .stroke();

        doc
          .fillColor(secondaryColor)
          .fontSize(8)
          .font(fontBold)
          .text("Subscription Period", 52, currentY + 10);

        doc
          .fillColor(primaryColor)
          .fontSize(11)
          .font(fontBold)
          .text(
            data.subscriptionPeriodStr || "08 Sep 2026 – 08 Oct 2026",
            52,
            currentY + 23,
          );

        doc
          .fillColor(secondaryColor)
          .fontSize(8)
          .font(fontRegular)
          .text(
            `Your ${data.planName || "Starter Plan"} will be active during this period.`,
            52,
            currentY + 38,
          );

        // --- 6.5. AUTHORIZED SIGNATURE ---
        if (fs.existsSync(this.signaturePath)) {
          const signatureX = 36;
          const signatureY = 625;
          const signatureWidth = 180;

          doc.save();

          doc
            .translate(signatureX + signatureWidth / 2, signatureY + 35)
            .rotate(-30)
            .translate(-(signatureX + signatureWidth / 2), -(signatureY + 35))
            .image(this.signaturePath, signatureX, signatureY, {
              width: signatureWidth,
            });

          doc.restore();

          doc
            .fillColor(primaryColor)
            .fontSize(10)
            .font(fontBold)
            .text("Authorized Signature", signatureX + 25, 720);
        }
        // --- 7. FOOTER ---
        const footerY = 760;
        doc
          .strokeColor(borderColor)
          .lineWidth(0.5)
          .moveTo(36, footerY - 15)
          .lineTo(559, footerY - 15)
          .stroke();

        doc
          .fillColor(primaryColor)
          .fontSize(10)
          .font(fontBold)
          .text("Thank you for choosing Shaivik Technologies!", 36, footerY);

        doc
          .fillColor(secondaryColor)
          .fontSize(8)
          .font(fontRegular)
          .text(
            "We appreciate your support and look forward to serving you.",
            36,
            footerY + 14,
          );

        doc
          .fillColor(primaryColor)
          .fontSize(10)
          .font(fontBold)
          .text("Shaivik Technologies", 380, footerY, { align: "right" });

        doc
          .fillColor(brandBlue)
          .fontSize(8)
          .font(fontRegular)
          .text("www.shaiviktechnologies.in", 380, footerY + 14, {
            align: "right",
            link: "https://www.shaiviktechnologies.in",
          });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
