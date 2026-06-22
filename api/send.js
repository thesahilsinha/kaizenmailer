import nodemailer from "nodemailer";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, subject, html, previewText } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Missing required fields: to, subject, html" });
  }

  const FROM_EMAIL = process.env.GMAIL_USER;
  const APP_PASSWORD = process.env.GMAIL_PASS;

  if (!FROM_EMAIL || !APP_PASSWORD) {
    return res.status(500).json({ error: "Server email credentials not configured" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: FROM_EMAIL,
        pass: APP_PASSWORD,
      },
    });

    const finalHtml = previewText
      ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}</div>${html}`
      : html;

    const info = await transporter.sendMail({
      from: `"Sahil Sinha — Kaizen ASC" <${FROM_EMAIL}>`,
      to,
      subject,
      html: finalHtml,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("Send error:", err);
    return res.status(500).json({ error: err.message });
  }
}
