const supportForm = document.getElementById("support-form");
const supportNote = document.getElementById("support-form-note");
const topicInput = document.getElementById("support-topic-input");
const topicTrigger = document.getElementById("support-topic-trigger");
const topicValue = document.getElementById("support-topic-value");
const topicMenu = document.getElementById("support-topic-menu");

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

supportForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!supportForm.reportValidity()) return;
  if (!topicInput.value) {
    supportNote.textContent = "Please choose a support topic.";
    topicTrigger.focus();
    setTopicMenu(true);
    return;
  }

  const data = new FormData(supportForm);
  const submitButton = supportForm.querySelector("button[type='submit']");

  supportNote.textContent = "Sending your support request...";
  submitButton.disabled = true;

  fetch("/api/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(data)),
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not send support request.");

      supportForm.reset();
      supportNote.textContent = "Sent. Our support team will get back to you soon.";
    })
    .catch((error) => {
      supportNote.textContent = error.message;
    })
    .finally(() => {
      submitButton.disabled = false;
    });
});
