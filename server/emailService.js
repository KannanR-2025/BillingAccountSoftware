const nodemailer = require('nodemailer');
const { generateInvoicePDF } = require('./pdfGenerator');

async function sendInvoiceEmail(invoice, smtpConfig) {
    const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: parseInt(smtpConfig.port) || 587,
        secure: smtpConfig.port == 465,
        family: 4,
        auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass,
        },
    });

    // Generate PDF into a buffer
    const pdfBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        const stream = {
            write: (chunk) => chunks.push(chunk),
            end: () => resolve(Buffer.concat(chunks)),
            on: () => {},
        };

        // Use a PassThrough stream to capture PDF output
        const { PassThrough } = require('stream');
        const pass = new PassThrough();
        const buffers = [];
        pass.on('data', (chunk) => buffers.push(chunk));
        pass.on('end', () => resolve(Buffer.concat(buffers)));
        pass.on('error', reject);

        generateInvoicePDF(invoice, pass);
    });

    const customerName = invoice.customer?.name || 'Customer';
    const billNo = invoice.billNo || invoice.bill_no;
    const vendorName = invoice.vendor?.name || 'Your Vendor';
    const fromAddress = smtpConfig.fromName
        ? `"${smtpConfig.fromName}" <${smtpConfig.user}>`
        : smtpConfig.user;

    await transporter.sendMail({
        from: fromAddress,
        to: invoice.customer.email,
        subject: `Invoice ${billNo} from ${vendorName}`,
        html: `
            <p>Dear ${customerName},</p>
            <p>Please find attached your invoice <strong>${billNo}</strong> from <strong>${vendorName}</strong>.</p>
            <p>Thank you for your business.</p>
            <br/>
            <p>Regards,<br/>${vendorName}</p>
        `,
        attachments: [
            {
                filename: `invoice_${billNo}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    });
}

module.exports = { sendInvoiceEmail };
