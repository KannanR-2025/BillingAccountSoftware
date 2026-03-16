const { google } = require("googleapis");
const nodemailer = require("nodemailer");
const { generateInvoicePDF } = require("./pdfGenerator");

async function sendInvoiceEmail(invoice, gmailConfig) {
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
  const fromName = gmailConfig?.fromName || vendorName;

  const oauth2Client = new google.auth.OAuth2(
    gmailConfig.clientId,
    gmailConfig.clientSecret,
    "http://localhost:3001/callback"
  );
  oauth2Client.setCredentials({ refresh_token: gmailConfig.refreshToken });

  const transport = nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true,
  });

  const { message } = await transport.sendMail({
    from: `"${fromName}" <${gmailConfig.gmailUser}>`,
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

  const raw = message
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return result.data;
}

module.exports = { sendInvoiceEmail };
