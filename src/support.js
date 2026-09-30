/* Submissions land in the `support_requests` table in Supabase. The browser
 * only ever holds the publishable key, and row level security allows nothing
 * but INSERT — reading the queue happens in the dashboard. */
const IDLE_NOTE = "We usually reply within one business day";

const supportForm = document.getElementById("support-form");
const supportNote = document.getElementById("support-form-note");
const topicInput = document.getElementById("support-topic-input");
const topicTrigger = document.getElementById("support-topic-trigger");
const topicValue = document.getElementById("support-topic-value");
const topicMenu = document.getElementById("support-topic-menu");
const successPanel = document.getElementById("support-success");
const sendAnotherButton = document.getElementById("support-send-another");

function setTopicMenu(open) {
  topicTrigger?.setAttribute("aria-expanded", String(open));
  topicMenu?.classList.toggle("is-open", open);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOPICS = ["Account or subscription", "App feedback", "Technical issue", "Something else"];

/* Mirrors the check constraints on the support_requests table, so a bad value
 * gets a readable sentence here instead of a raw Postgres 400 from PostgREST.
 * Returns the first problem found, or null when everything passes. */
function findProblem(data) {
  const name = (data.name || "").trim();
  if (name.length < 2) {
    return { field: "name", message: "Please enter your name (at least 2 characters)." };
  }
  if (name.length > 120) {
    return { field: "name", message: "That name is too long — 120 characters max." };
  }

  const email = (data.email || "").trim();
  if (!EMAIL_PATTERN.test(email)) {
    return { field: "email", message: "That email address doesn't look right." };
  }
  if (email.length > 254) {
    return { field: "email", message: "That email address is too long." };
  }

  // Guards against a tampered hidden input, not just an empty one.
  if (!TOPICS.includes(data.topic)) {
    return { field: "topic", message: "Please choose a support topic." };
  }

  const message = (data.message || "").trim();
  if (message.length < 10) {
    return { field: "message", message: "Please tell us a little more — at least 10 characters." };
  }
  if (message.length > 5000) {
    return { field: "message", message: "That message is too long — 5000 characters max." };
  }

  return null;
}

function showProblem(problem) {
  supportNote.textContent = problem.message;
  supportForm.classList.add("has-error");

  if (problem.field === "topic") {
    topicTrigger?.setAttribute("aria-invalid", "true");
    topicTrigger?.focus();
    setTopicMenu(true);
    return;
  }
  const field = supportForm.querySelector(`[name='${problem.field}']`);
  field?.setAttribute("aria-invalid", "true");
  field?.focus();
}

topicTrigger?.addEventListener("click", () => {
  setTopicMenu(topicTrigger.getAttribute("aria-expanded") !== "true");
});

topicMenu?.addEventListener("click", (event) => {
  const option = event.target.closest("[data-value]");
  if (!option) return;

  topicInput.value = option.dataset.value;
  topicInput.dispatchEvent(new Event("input", { bubbles: true }));
  topicValue.textContent = option.dataset.value;
  topicMenu.querySelectorAll("[role='option']").forEach((item) => {
    item.setAttribute("aria-selected", String(item === option));
  });
  setTopicMenu(false);
  topicTrigger?.focus();
});

const topicOptions = () => [...(topicMenu?.querySelectorAll("[role='option']") || [])];

// Arrow keys open the list from the trigger and move between its options.
topicTrigger?.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  setTopicMenu(true);
  const options = topicOptions();
  (options.find((item) => item.getAttribute("aria-selected") === "true") || options[0])?.focus();
});

topicMenu?.addEventListener("keydown", (event) => {
  const options = topicOptions();
  const index = options.indexOf(document.activeElement);
  const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: options.length - 1 }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  options[(next + options.length) % options.length]?.focus();
});

document.addEventListener("click", (event) => {
  if (!topicTrigger?.contains(event.target) && !topicMenu?.contains(event.target)) {
    setTopicMenu(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const inMenu = topicMenu?.contains(document.activeElement);
  setTopicMenu(false);
  if (inMenu) topicTrigger?.focus();
});

// Clear a validation complaint as soon as the visitor starts fixing it.
supportForm?.addEventListener("input", () => {
  supportForm.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
  if (!supportForm.classList.contains("has-error")) return;
  supportForm.classList.remove("has-error");
  supportNote.textContent = IDLE_NOTE;
});

function resetTopic() {
  topicInput.value = "";
  topicValue.textContent = "Select a topic";
  topicMenu?.querySelectorAll("[role='option']").forEach((item) => {
    item.setAttribute("aria-selected", "false");
  });
}

function showSuccess() {
  supportForm.classList.remove("is-sending", "has-error");
  supportForm.classList.add("is-success");
  supportForm.setAttribute("aria-busy", "false");
  successPanel?.setAttribute("aria-hidden", "false");
  supportForm.reset();
  resetTopic();
  supportNote.textContent = IDLE_NOTE;
  window.setTimeout(() => sendAnotherButton?.focus(), 650);
}

sendAnotherButton?.addEventListener("click", () => {
  supportForm.classList.remove("is-success");
  successPanel?.setAttribute("aria-hidden", "true");
  supportNote.textContent = IDLE_NOTE;
  window.setTimeout(() => supportForm.querySelector("input[name='name']")?.focus(), 180);
});

// Local-only visual preview for checking the confirmation animation without writing a row.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "success") {
  window.setTimeout(showSuccess, 450);
}

supportForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (supportForm.classList.contains("is-sending")) return;
  if (!supportForm.reportValidity()) return;

  const data = Object.fromEntries(new FormData(supportForm));

  const problem = findProblem(data);
  if (problem) {
    showProblem(problem);
    return;
  }

  supportForm.classList.remove("has-error");
  supportForm.classList.add("is-sending");
  supportForm.setAttribute("aria-busy", "true");
  supportNote.textContent = "Sending your request...";

  try {
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name.trim(), email: data.email.trim(), topic: data.topic, message: data.message.trim(), website: data.website || "" }),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Support request failed");
  } catch (error) {
    console.error("Support request failed", error);
    supportForm.classList.remove("is-sending");
    supportForm.setAttribute("aria-busy", "false");
    supportForm.classList.add("has-error");
    supportNote.textContent =
      "We couldn't send that. Please try again or email support@dailymattr.com.";
    return;
  }

  showSuccess();
});
