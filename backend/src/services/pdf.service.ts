import PDFDocument from 'pdfkit';

interface ChallanItem {
  id: string;
  productSnapshot: any; // { name, sku, category }
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ChallanData {
  challanNumber: string;
  customerSnapshot: any; // { name, businessName, address, mobile, email, gstNumber, customerType }
  status: string;
  totalAmount: number;
  createdAt: Date;
  items: ChallanItem[];
}

export const generateChallanPDF = (challan: any, writeStream: NodeJS.WritableStream): void => {
  const doc = new PDFDocument({ margin: 50 });

  // Pipe the PDF document to the provided write stream
  doc.pipe(writeStream);

  // --- HEADER SECTION ---
  doc
    .fillColor('#1e293b')
    .fontSize(20)
    .text('NEXORA — ERP & CRM OPERATIONS PORTAL', 50, 45)
    .fontSize(10)
    .text('123 Business Avenue, Suite 500', 50, 70)
    .text('Mumbai, MH, 400001 | contact@nexora.com', 50, 85)
    .moveDown();

  // Document Title Badge
  doc
    .rect(400, 45, 160, 40)
    .fill('#f1f5f9');
  
  doc
    .fillColor('#0f172a')
    .fontSize(12)
    .text('SALES CHALLAN', 410, 50, { width: 140, align: 'center' })
    .fontSize(9)
    .fillColor(challan.status === 'CONFIRMED' ? '#16a34a' : challan.status === 'CANCELLED' ? '#dc2626' : '#ea580c')
    .text(challan.status, 410, 68, { width: 140, align: 'center' });

  // Divider Line
  doc
    .moveTo(50, 110)
    .lineTo(560, 110)
    .strokeColor('#cbd5e1')
    .stroke();

  // --- INFO SECTION ---
  doc.fillColor('#0f172a');
  
  // Left side: Billing Details
  const customer = challan.customerSnapshot;
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Billed To:', 50, 130)
    .font('Helvetica')
    .fontSize(10)
    .text(customer.name, 50, 145)
    .font('Helvetica-Bold')
    .text(customer.businessName, 50, 160)
    .font('Helvetica')
    .text(customer.address, 50, 175, { width: 230 })
    .text(`Mobile: ${customer.mobile}`, 50, 215)
    .text(`Email: ${customer.email}`, 50, 230);
  
  if (customer.gstNumber) {
    doc.font('Helvetica-Bold').text(`GSTIN: ${customer.gstNumber}`, 50, 245).font('Helvetica');
  }

  // Right side: Challan Metadata
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Challan Details:', 350, 130)
    .font('Helvetica')
    .fontSize(10)
    .text(`Challan No: ${challan.challanNumber}`, 350, 145)
    .text(`Date: ${new Date(challan.createdAt).toLocaleDateString()}`, 350, 160)
    .text(`Status: ${challan.status}`, 350, 175)
    .text(`Customer Type: ${customer.customerType}`, 350, 190);

  // --- ITEMS TABLE SECTION ---
  const tableTop = 280;
  doc
    .fontSize(10)
    .font('Helvetica-Bold');

  // Table Header Background
  doc
    .rect(50, tableTop, 510, 20)
    .fill('#1e293b');

  // Header Texts
  doc
    .fillColor('#ffffff')
    .text('SKU', 60, tableTop + 5, { width: 80 })
    .text('Product Name', 150, tableTop + 5, { width: 180 })
    .text('Price (INR)', 340, tableTop + 5, { width: 70, align: 'right' })
    .text('Qty', 420, tableTop + 5, { width: 40, align: 'center' })
    .text('Total (INR)', 470, tableTop + 5, { width: 80, align: 'right' });

  let currentY = tableTop + 20;
  doc.font('Helvetica').fillColor('#0f172a');

  // Write Table Rows
  challan.items.forEach((item: any, idx: number) => {
    const product = item.productSnapshot;
    const isEven = idx % 2 === 0;

    // Row zebra background
    if (isEven) {
      doc
        .rect(50, currentY, 510, 20)
        .fill('#f8fafc');
    }

    doc
      .fillColor('#334155')
      .text(product.sku || 'N/A', 60, currentY + 5, { width: 80 })
      .text(product.name || 'Deleted Product', 150, currentY + 5, { width: 180 })
      .text(Number(item.unitPrice).toFixed(2), 340, currentY + 5, { width: 70, align: 'right' })
      .text(String(item.quantity), 420, currentY + 5, { width: 40, align: 'center' })
      .text(Number(item.totalPrice).toFixed(2), 470, currentY + 5, { width: 80, align: 'right' });

    currentY += 20;
  });

  // Summary Row
  doc
    .moveTo(50, currentY + 10)
    .lineTo(560, currentY + 10)
    .strokeColor('#cbd5e1')
    .stroke();

  doc
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .fontSize(11)
    .text('Grand Total:', 340, currentY + 15, { width: 120, align: 'right' })
    .text(`INR ${Number(challan.totalAmount).toFixed(2)}`, 470, currentY + 15, { width: 80, align: 'right' });

  // --- FOOTER SECTION ---
  const footerY = doc.page.height - 100;
  doc
    .moveTo(50, footerY)
    .lineTo(560, footerY)
    .strokeColor('#e2e8f0')
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#64748b')
    .text('Thank you for your business!', 50, footerY + 10, { align: 'center' })
    .text('This is a computer-generated document, signatures are not required.', 50, footerY + 22, { align: 'center' });

  // Finalize Document
  doc.end();
};
