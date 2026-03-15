const nodemailer = require("nodemailer");
const { generateInvoicePDF } = require("./pdfGenerator");

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const GMAIL_USER = process.env.GMAIL_USER;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: GMAIL_USER,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: REFRESH_TOKEN,
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
