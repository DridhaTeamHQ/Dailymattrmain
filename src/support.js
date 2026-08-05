/* Submissions land in the `support_requests` table in Supabase. The browser
 * only ever holds the publishable key, and row level security allows nothing
 * but INSERT — reading the queue happens in the dashboard. */
import { supabase } from "./supabaseClient.js";

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
});

document.addEventListener("click", (event) => {
  if (!topicTrigger?.contains(event.target) && !topicMenu?.contains(event.target)) {
    setTopicMenu(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setTopicMenu(false);
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
  if (!topicInput.value) {
    supportNote.textContent = "Please choose a support topic.";
    supportForm.classList.add("has-error");
    topicTrigger.focus();
    setTopicMenu(true);
    return;
  }

  const data = Object.fromEntries(new FormData(supportForm));

  supportForm.classList.remove("has-error");
  supportForm.classList.add("is-sending");
  supportForm.setAttribute("aria-busy", "true");
  supportNote.textContent = "Sending your request...";

  const { error } = await supabase.from("support_requests").insert({
    name: data.name.trim(),
    email: data.email.trim(),
    topic: data.topic,
    message: data.message.trim(),
  });

  if (error) {
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
