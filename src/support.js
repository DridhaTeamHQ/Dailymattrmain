/* No email provider is wired up right now. The form gathers the details
 * and hands them to the visitor's own mail app, pre-addressed to
 * support@dailymattr.com — so support works with zero backend, zero API
 * keys and no third-party service. Swap this for a real provider later
 * by POSTing to an /api/support function again. */
const SUPPORT_EMAIL = "support@dailymattr.com";

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
  window.setTimeout(() => sendAnotherButton?.focus(), 650);
}

sendAnotherButton?.addEventListener("click", () => {
  supportForm.classList.remove("is-success");
  successPanel?.setAttribute("aria-hidden", "true");
  supportNote.textContent = "Opens in your email app";
  window.setTimeout(() => supportForm.querySelector("input[name='name']")?.focus(), 180);
});

// Local-only visual preview for checking the confirmation animation without sending an email.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "success") {
  window.setTimeout(showSuccess, 450);
}

supportForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!supportForm.reportValidity()) return;
  if (!topicInput.value) {
    supportNote.textContent = "Please choose a support topic.";
    supportForm.classList.add("has-error");
    topicTrigger.focus();
    setTopicMenu(true);
    return;
  }

  const data = Object.fromEntries(new FormData(supportForm));
  const subject = `DailyMattr support: ${data.topic}`;
  const body = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Topic: ${data.topic}`,
    "",
    data.message,
  ].join("\n");

  supportForm.classList.remove("has-error");
  // hand off to the visitor's mail app with everything pre-filled
  window.location.href =
    `mailto:${SUPPORT_EMAIL}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  showSuccess();
});
