import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

async function main() {
  const doc = new PDFDocument({ size: "A4", margin: 36 });
  const stream = fs.createWriteStream("test_noto_rupee.pdf");
  doc.pipe(stream);

  const fontRegular = path.join(
    process.cwd(),
    "src/assets/fonts/NotoSans-Regular.ttf",
  );
  const fontBold = path.join(
    process.cwd(),
    "src/assets/fonts/NotoSans-Bold.ttf",
  );

  doc.registerFont("NotoSans", fontRegular);
  doc.registerFont("NotoSans-Bold", fontBold);

  doc
    .font("NotoSans-Bold")
    .fontSize(18)
    .fillColor("#2563EB")
    .text("Testing Real Unicode Rupee Glyph:");
  doc
    .font("NotoSans")
    .fontSize(14)
    .fillColor("#0F172A")
    .text("Subtotal: ₹199.00");
  doc
    .font("NotoSans")
    .fontSize(14)
    .fillColor("#0F172A")
    .text("Discount: ₹0.00");
  doc
    .font("NotoSans")
    .fontSize(14)
    .fillColor("#0F172A")
    .text("Tax (0%): ₹0.00");
  doc
    .font("NotoSans-Bold")
    .fontSize(16)
    .fillColor("#2563EB")
    .text("Total Paid: ₹1,199.00");
  doc
    .font("NotoSans-Bold")
    .fontSize(16)
    .fillColor("#2563EB")
    .text("Total Paid: ₹10,000.00");

  doc.end();
  stream.on("finish", () => console.log("Noto Sans PDF finished."));
}

main();
