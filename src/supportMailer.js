import { Resend } from "resend";

const SUPPORT_TO_EMAIL = "support@dailymattr.com";

function clean(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizePayload(payload = {}) {
  const message = {
    name: clean(payload.name),
    email: clean(payload.email),
    topic: clean(payload.topic),
    body: clean(payload.message),
  };

  if (!message.name || !message.email || !message.topic || !message.body) {
    throw Object.assign(new Error("Please complete every field."), { statusCode: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email)) {
    throw Object.assign(new Error("Please enter a valid email address."), { statusCode: 400 });
  }

  return message;
}

export async function sendSupportEmail(payload) {
  const message = normalizePayload(payload);
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw Object.assign(
      new Error("Support email is not configured yet. Add RESEND_API_KEY in the hosting environment."),
      {
        statusCode: 503,
        publicMessage: "Support email is not configured yet. Add RESEND_API_KEY in the hosting environment.",
      }
    );
  }

  const to = clean(process.env.SUPPORT_TO_EMAIL) || SUPPORT_TO_EMAIL;
  const from = clean(process.env.SUPPORT_FROM_EMAIL) || "DailyMattr Support <support@dailymattr.com>";
  const subject = `DailyMattr support: ${message.topic}`;
  const text = [
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    `Topic: ${message.topic}`,
    "",
    message.body,
  ].join("\n");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    replyTo: message.email,
    text,
    html: `
      <h2>DailyMattr support request</h2>
      <p><strong>Name:</strong> ${escapeHtml(message.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(message.email)}</p>
      <p><strong>Topic:</strong> ${escapeHtml(message.topic)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message.body).replace(/\n/g, "<br>")}</p>
    `,
  });

  if (error) {
    throw Object.assign(new Error(`Email provider rejected the request. ${error.message}`), {
      statusCode: 502,
      publicMessage: error.message.includes("domain is not verified")
        ? "Support email needs dailymattr.com verified in Resend before messages can be sent."
        : "The email provider rejected this message. Please check the Resend setup.",
    });
  }

  return { ok: true, to };
}
