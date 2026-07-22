import { sendSupportEmail } from "../src/supportMailer.js";

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") return Promise.resolve(JSON.parse(req.body || "{}"));

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(Object.assign(new Error("Invalid JSON body."), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const body = await readBody(req);
    const result = await sendSupportEmail(body);
    res.status(200).json({ ok: true, to: result.to });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.publicMessage
        || (error.statusCode && error.statusCode < 500
          ? error.message
          : "We could not send the message right now. Please email support@dailymattr.com directly."),
    });
  }
}
