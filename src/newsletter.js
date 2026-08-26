/* /newsletter — subscribe form wired to the Shortly email agent's
 * `subscribers` edge function (action: "subscribe" is its public path:
 * it validates, upserts into public.subscribers, re-subscribes lapsed
 * readers, and sends the branded welcome email). */

const SUPABASE_URL = "https://ygxdrphajvrbjcaxhvcn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlneGRycGhhanZyYmpjYXhodmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDU0MjEsImV4cCI6MjA5NDkyMTQyMX0.odfY4E1DCxjb8kaXOkax4c_VI96QrzhoIW7cF6WMbes";

const form = document.getElementById("nl-form");
const nameInput = document.getElementById("nl-name");
const emailInput = document.getElementById("nl-email");
const consentInput = document.getElementById("nl-consent");
const errorEl = document.getElementById("nl-error");
const submitBtn = document.getElementById("nl-submit");
const doneEl = document.getElementById("nl-done");
const doneBadgeEl = document.getElementById("nl-done-badge");
const doneTitleEl = document.getElementById("nl-done-title");
const doneCopyEl = document.getElementById("nl-done-copy");
const againBtn = document.getElementById("nl-again");

/* the edge function tells us which case this was:
 *   {created:true}                    -> brand new, welcome email sent
 *   {existing:true, resubscribed:1}   -> was unsubscribed, switched back on
 *   {existing:true}                   -> already on the list */
function showResult(result, email) {
  const strongEmail = `<strong>${email.replace(/</g, "&lt;")}</strong>`;
  if (result.existing && !result.resubscribed) {
    doneBadgeEl.textContent = "👋";
    doneTitleEl.textContent = "You’re already subscribed!";
    doneCopyEl.innerHTML = `${strongEmail} is already on our list — no need to sign up again. Your next edition arrives tomorrow morning.`;
  } else if (result.existing && result.resubscribed) {
    doneBadgeEl.textContent = "🙌";
    doneTitleEl.textContent = "Welcome back!";
    doneCopyEl.innerHTML = `We’ve switched ${strongEmail} back on. Good reads resume tomorrow morning.`;
  } else {
    doneBadgeEl.textContent = "🎉";
    doneTitleEl.textContent = "You’re on the list!";
    doneCopyEl.innerHTML = `Look out for a welcome note in ${strongEmail}. Good reads are on their way.`;
  }
  form.hidden = true;
  doneEl.hidden = false;
}

const showError = (message) => {
  errorEl.textContent = message;
  errorEl.hidden = !message;
};

async function subscribe({ name, email }) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/subscribers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      action: "subscribe",
      email,
      name: name || undefined,
      rhythm: "daily",
      categories: ["general"],
      source_preference: "mixed",
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new Error(body.error || "We could not subscribe you just now. Please try again.");
  }
  return body;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");

  const email = emailInput.value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("Please enter a valid email address.");
    emailInput.focus();
    return;
  }
  if (!consentInput.checked) {
    showError("Please confirm you are happy to receive the newsletter.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector(".nl-button-label").textContent = "Sending your invite…";
  try {
    const result = await subscribe({ name: nameInput.value.trim(), email });
    showResult(result, email);
  } catch (error) {
    showError(error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector(".nl-button-label").innerHTML =
      'Send me the good stuff <span class="nl-arrow">→</span>';
  }
});

againBtn.addEventListener("click", () => {
  emailInput.value = "";
  doneEl.hidden = true;
  form.hidden = false;
  emailInput.focus();
});
