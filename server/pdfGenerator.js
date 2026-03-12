const PDFDocument = require('pdfkit');

function generateInvoicePDF(data, stream) {
    // A5 landscape: 595.28 x 419.53 points
    const doc = new PDFDocument({ margin: 20, size: 'A5', layout: 'landscape' });

    doc.pipe(stream);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 20;
    const width = pageW - margin * 2;
    const startX = margin;
    let currentY = margin;

    // --- Main Border ---
    doc.rect(startX, margin, width, pageH - margin * 2).stroke();

    // --- Header ---
    doc.fontSize(13).font('Helvetica-Bold').text('TAX INVOICE', startX, currentY + 5, { align: 'center', width });

    // --- Logo (top left, inside header row) ---
    if (data.vendor && data.vendor.logo) {
        try {
            const base64Data = data.vendor.logo.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            doc.image(imgBuffer, startX + 5, margin + 2, { height: 20, fit: [60, 20] });
        } catch (e) { /* skip if image fails */ }
    }

    currentY += 25;
    doc.moveTo(startX, currentY).lineTo(startX + width, currentY).stroke();

    // --- Vendor Details (left) ---
    const vendorStartY = currentY;
    doc.fontSize(9).font('Helvetica-Bold').text(data.vendor.name, startX + 8, currentY + 5, { width: width / 2 - 15 });
    doc.fontSize(7.5).font('Helvetica').text(data.vendor.address || '', startX + 8, doc.y + 1, { width: width / 2 - 15 });
    doc.text(`GSTIN: ${data.vendor.gstin || ''}`, startX + 8, doc.y + 1);
    if (data.vendor.phone || data.vendor.mobile) {
        doc.text(`Contact: ${data.vendor.phone || ''} ${data.vendor.mobile ? '/ ' + data.vendor.mobile : ''}`, startX + 8, doc.y + 1);
    }
    if (data.vendor.email) {
        doc.text(`Email: ${data.vendor.email}`, startX + 8, doc.y + 1);
    }

    // --- Bill Info Box (right) ---
    const infoX = startX + width / 2 + 8;
    let infoY = vendorStartY + 5;
    const labelW = 65;
    const valX = infoX + labelW;

    doc.fontSize(7.5).font('Helvetica').text('Invoice No :', infoX, infoY);
    doc.font('Helvetica-Bold').text(data.billNo, valX, infoY);
    infoY += 12;
    doc.font('Helvetica').text('Date :', infoX, infoY);
    doc.font('Helvetica-Bold').text(data.billDate, valX, infoY);
    infoY += 12;
    doc.font('Helvetica').text('State :', infoX, infoY);
    doc.text('Tamil Nadu', valX, infoY, { width: width / 2 - labelW - 15 });
    infoY += 12;
    doc.font('Helvetica').text('Place of Supply :', infoX, infoY);
    doc.text('Tamil Nadu', valX, infoY, { width: width / 2 - labelW - 15 });

    currentY = vendorStartY + 65;
    doc.moveTo(startX, currentY).lineTo(startX + width, currentY).stroke();
    doc.moveTo(startX + width / 2, vendorStartY).lineTo(startX + width / 2, currentY).stroke();

    // --- Customer Details ---
    const customer = data.customer || { name: 'Unknown', address: '', gstin: '' };
    doc.fontSize(7.5).font('Helvetica-Bold').text('BILL TO:', startX + 8, currentY + 4);
    doc.fontSize(9).text(customer.name, startX + 45, currentY + 4);
    doc.fontSize(7.5).font('Helvetica').text(customer.address || '', startX + 8, doc.y + 1, { width: width / 2 - 15 });
    doc.font('Helvetica-Bold').text(`GSTIN: ${customer.gstin || ''}`, startX + 8, doc.y + 1);

    currentY += 40;
    doc.moveTo(startX, currentY).lineTo(startX + width, currentY).stroke();

    // --- Table Header ---
    const colSno = startX + 5;
    const colDesc = startX + 28;
    const colHsn = startX + width * 0.42;
    const colQty = startX + width * 0.54;
    const colRate = startX + width * 0.63;
    const colAmt = startX + width * 0.78;
    const colEnd = startX + width;

    const tableHeaderY = currentY;
    doc.fontSize(7.5).font('Helvetica-Bold');
    doc.text('S.No', colSno, tableHeaderY + 4, { width: 22, align: 'center' });
    doc.text('Particulars / Description', colDesc, tableHeaderY + 4, { width: colHsn - colDesc - 5 });
    doc.text('HSN/SAC', colHsn, tableHeaderY + 4, { width: colQty - colHsn, align: 'center' });
    doc.text('Qty', colQty, tableHeaderY + 4, { width: colRate - colQty, align: 'center' });
    doc.text('Rate', colRate, tableHeaderY + 4, { width: colAmt - colRate, align: 'center' });
    doc.text('Amount (Rs.)', colAmt, tableHeaderY + 4, { width: colEnd - colAmt - 5, align: 'right' });

    currentY += 16;
    doc.moveTo(startX, currentY).lineTo(startX + width, currentY).stroke();

    // Vertical column lines helper
    const drawTableLines = (yStart, yEnd) => {
        [colDesc - 3, colHsn, colQty, colRate, colAmt].forEach(x => {
            doc.moveTo(x, yStart).lineTo(x, yEnd).stroke();
        });
    };

    // --- Table Content ---
    let y = currentY + 5;
    doc.font('Helvetica').fontSize(7.5);
    const items = data.items || [];
    items.forEach((item, index) => {
        const rate = parseFloat(item.amount) || 0;
        const lineTotal = rate;

        doc.text(index + 1, colSno, y, { width: 22, align: 'center' });
        doc.text(item.description || '', colDesc, y, { width: colHsn - colDesc - 5 });
        doc.text(item.sacCode || '', colHsn, y, { width: colQty - colHsn, align: 'center' });
        doc.text('-', colQty, y, { width: colRate - colQty, align: 'center' });
        doc.text(rate.toFixed(2), colRate, y, { width: colAmt - colRate, align: 'center' });
        doc.text(lineTotal.toFixed(2), colAmt, y, { width: colEnd - colAmt - 5, align: 'right' });
        y = Math.max(y + 14, doc.y + 5);
    });

    // Dynamic tax section position — leave space for bottom content
    const taxSectionY = Math.max(y + 5, pageH - margin - 120);
    drawTableLines(tableHeaderY, taxSectionY);
    doc.moveTo(startX, taxSectionY).lineTo(startX + width, taxSectionY).stroke();

    // --- Totals Section (right side) ---
    currentY = taxSectionY + 4;
    const labelX = colRate - 10;
    const amtRightX = colAmt;
    const amtRightW = colEnd - colAmt - 5;

    const drawRow = (label, value, isBold = false) => {
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5);
        doc.text(label, labelX, currentY, { width: colAmt - labelX - 5, align: 'right' });
        doc.text(value, amtRightX, currentY, { width: amtRightW, align: 'right' });
        currentY += 11;
    };

    const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount || 0)), 0);
    drawRow('Sub Total:', subTotal.toFixed(2));
    drawRow(`SGST @ ${data.sgstRate || 0}%:`, (data.sgstAmount || 0).toFixed(2));
    drawRow(`CGST @ ${data.cgstRate || 0}%:`, (data.cgstAmount || 0).toFixed(2));
    doc.moveTo(labelX + 30, currentY).lineTo(colEnd, currentY).stroke();
    currentY += 3;
    drawRow('Total Amount:', (data.totalAmount || 0).toFixed(2), true);

    // --- Amount in Words (left, below table) ---
    let leftY = taxSectionY + 4;
    doc.fontSize(7).font('Helvetica-Bold').text('Amount in words:', startX + 8, leftY);
    doc.font('Helvetica').text(data.amountInWords || 'Zero only', startX + 8, doc.y + 1, { width: width * 0.55 });

    // --- Bank Details (absolute bottom left) ---
    const bank = data.bank || data.vendor?.bank_details;
    if (bank && (bank.bankName || bank.name)) {
        const bankBoxY = pageH - margin - 45; // 45pt above bottom margin (same as signature box height)
        doc.fontSize(7).font('Helvetica-Bold').text('Bank Details:', startX + 10, bankBoxY + 4);
        doc.font('Helvetica');
        let y = doc.y + 1;
        doc.text(`Bank: ${bank.bankName || bank.name || ''}`, startX + 10, y);
        y = doc.y + 1;
        doc.text(`A/c No: ${bank.accountNo || ''}`, startX + 10, y);
        y = doc.y + 1;
        doc.text(`IFSC: ${bank.ifsc || ''}`, startX + 10, y);
        if (bank.branch) {
            y = doc.y + 1;
            doc.text(`Branch: ${bank.branch}`, startX + 10, y);
        }
    }

        // --- Signature (bottom right) ---
        const sigX = startX + width * 0.6;
        const sigY = pageH - margin - 45;
        const sigWidth = startX + width - sigX - 5;
        const signatureImage = data.vendor?.signature;
        if (signatureImage) {
            try {
                const imgBuffer = Buffer.from(signatureImage.split(',')[1], 'base64');
                doc.image(imgBuffer, sigX, sigY, { width: sigWidth, height: 30, fit: [sigWidth, 30], align: 'right' });
            } catch (e) { /* ignore bad image */ }
        } else {
            const signatory = data.vendor?.signatory || '';
            if (signatory) {
                doc.fontSize(8).font('Helvetica-Bold').text(signatory, sigX, sigY + 18, { align: 'right', width: sigWidth });
            }
        }
        doc.fontSize(7).font('Helvetica').text('Authorised Signatory', sigX, pageH - margin - 10, { align: 'right', width: sigWidth });

    doc.end();
}

module.exports = { generateInvoicePDF };
