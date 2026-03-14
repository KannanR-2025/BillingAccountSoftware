const { Resend } = require("resend");
const { generateInvoicePDF } = require("./pdfGenerator");

const RESEND_API_KEY = "re_Xy5jgGr4_BtGCCrkGmRsMJCwQ6sBhGkCT";
const resend = new Resend(RESEND_API_KEY);

async function sendInvoiceEmail(invoice, smtpConfig) {
  // Generate PDF into a buffer
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

  const { data, error } = await resend.emails.send({
    from: `${fromName} <onboarding@resend.dev>`,
    to: [invoice.customer.email],
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
        content: pdfBuffer.toString("base64"),
      },
    ],
  });

  if (error) {
    throw new Error(error.message || "Failed to send email via Resend");
  }

  return data;
}

module.exports = { sendInvoiceEmail };
