const nodemailer = require("nodemailer");
const { generateInvoicePDF } = require("./pdfGenerator");

const GMAIL_USER = "kannanclientsdb@gmail.com";
const GMAIL_APP_PASSWORD = "paqjkliqljwdckxb";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

async function sendInvoiceEmail(invoice, smtpConfig) {
  const pdfBuffer = await new Promise((resolve, reject) => {
    const { PassThrough } = require("stream");
    const pass = new PassThrough();
    const buffers = [];
    pass.on("data", (chunk) => buffers.push(chunk));
    pass.on("end", () => resolve(Buffer.concat(buffers)));
    pass.on("error", reject);
    generateInvoicePDF(invoice, pass);
  });

  const customerName = invoice.customer?.name || "Customer";
  const billNo = invoice.billNo || invoice.bill_no;
  const vendorName = invoice.vendor?.name || "Your Vendor";
  const fromName = smtpConfig?.fromName || vendorName;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${GMAIL_USER}>`,
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
        contentType: "application/pdf",
      },
    ],
  });

  return info;
}

module.exports = { sendInvoiceEmail };
