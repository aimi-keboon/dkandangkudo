// Per-rider outride booking UX. The server recalculates every amount.
(() => {
  const form = document.getElementById("publicBookingForm");
  if (!form) return;

  const paxInput = document.getElementById("pax");
  const container = document.getElementById("ridersContainer");
  const riderJsonInput = document.getElementById("ridersJson");
  const dateInput = document.getElementById("rideDate");
  const dateHint = document.getElementById("rideDateHint");
  const message = document.getElementById("bookingMessage");
  const submit = form.querySelector('button[type="submit"]');
  const currency = new Intl.NumberFormat("en-MY", {style: "currency", currency: "MYR", minimumFractionDigits: 0, maximumFractionDigits: 0});

  const escape = value => String(value).replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const maxRiders = 10;
  const riderState = [];

  function currentRiders() {
    return [...container.querySelectorAll(".rider-card")].map(card => ({
      name: card.querySelector('[data-rider="name"]').value.trim(),
      phone: card.querySelector('[data-rider="phone"]').value.trim(),
      weight: card.querySelector('[data-rider="weight"]').value,
      experience: card.querySelector('[data-rider="experience"]').value,
      helmet: card.querySelector('[data-rider="helmet"]').checked,
      boots: card.querySelector('[data-rider="boots"]').checked
    }));
  }

  function riderCard(index, data) {
    const n = index + 1;
    const select = ['Beginner','Intermediate','Experienced'].map(level =>
      '<option value="' + level + '"' + (data.experience === level ? ' selected' : '') + '>' + level + '</option>').join('');
    return '<section class="rider-card" aria-labelledby="rider-heading-' + n + '">' +
      '<h3 id="rider-heading-' + n + '">Rider ' + n + '</h3>' +
      '<div class="rider-grid">' +
      '<div><label for="rider-name-' + n + '">Full name</label><input id="rider-name-' + n + '" data-rider="name" autocomplete="off" maxlength="120" required value="' + escape(data.name || '') + '" placeholder="Name on ID"></div>' +
      '<div><label for="rider-phone-' + n + '">Mobile number</label><input id="rider-phone-' + n + '" data-rider="phone" type="tel" inputmode="tel" autocomplete="off" maxlength="24" required value="' + escape(data.phone || '') + '" placeholder="+60 12-345 6789"></div>' +
      '<div><label for="rider-weight-' + n + '">Weight (kg)</label><input id="rider-weight-' + n + '" data-rider="weight" type="number" min="20" max="250" step="0.1" inputmode="decimal" required value="' + escape(data.weight || '') + '" placeholder="e.g. 65"></div>' +
      '<div><label for="rider-exp-' + n + '">Riding experience</label><select id="rider-exp-' + n + '" data-rider="experience" required><option value="">Select experience</option>' + select + '</select></div>' +
      '</div><div class="rental-options"><label><input type="checkbox" data-rider="helmet"' + (data.helmet ? ' checked' : '') + '> Helmet rental <span>+RM15</span></label>' +
      '<label><input type="checkbox" data-rider="boots"' + (data.boots ? ' checked' : '') + '> Boots rental <span>+RM15</span></label></div>' +
      '</section>';
  }

  function updateSummary() {
    const riders = currentRiders();
    const helmetCount = riders.filter(r => r.helmet).length;
    const bootsCount = riders.filter(r => r.boots).length;
    const total = riders.length * 250 + (helmetCount + bootsCount) * 15;
    document.getElementById("bookingTotal").textContent = currency.format(total) + " total";
    document.getElementById("paxPriceText").textContent = riders.length + " rider" + (riders.length === 1 ? "" : "s") + " × RM250";
    document.getElementById("rentalPriceText").textContent =
      "Helmets: " + helmetCount + " × RM15 · Boots: " + bootsCount + " × RM15";
    document.getElementById("calculatedTotal").value = String(total);
    riderJsonInput.value = JSON.stringify(riders);
    const selected = form.querySelector('input[name="session"]:checked');
    let details = [];
    if (dateInput.value) {
      const date = new Date(dateInput.value + "T12:00:00");
      details.push(date.toLocaleDateString("en-MY", {weekday:"short",day:"numeric",month:"short",year:"numeric"}));
    }
    if (selected) details.push(selected.value);
    document.getElementById("selectedSessionText").textContent =
      details.length ? details.join(" · ") : "Choose a date and session above.";
  }

  function render() {
    const previous = currentRiders();
    const desired = Number(paxInput.value);
    const count = Number.isInteger(desired) ? Math.max(1, Math.min(maxRiders, desired)) : 1;
    paxInput.value = String(count);
    container.innerHTML = Array.from({length: count}, (_, i) =>
      riderCard(i, previous[i] || riderState[i] || {})).join("");
    updateSummary();
  }
  const now = new Date();
  dateInput.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);

  function validDate() {
    const chosen = dateInput.value;
    const date = chosen ? new Date(chosen + "T12:00:00") : null;
    const invalid = date && date.getDay() === 1;
    const past = Boolean(chosen && chosen < dateInput.min);
    dateInput.setCustomValidity(invalid ? "Closed on Mondays. Choose another day." :
      past ? "Please choose a future date." : "");
    dateHint.textContent = invalid ? "Closed on Mondays. Choose another day." :
      "Closed on Mondays. Dates and sessions are subject to confirmation.";
    dateHint.classList.toggle("field-error", Boolean(invalid || past));
    return !invalid && !past;
  }

  paxInput.addEventListener("change", render);
  paxInput.addEventListener("input", () => {
    if (paxInput.value && Number(paxInput.value) >= 1 && Number(paxInput.value) <= maxRiders) render();
  });
  container.addEventListener("input", updateSummary);
  container.addEventListener("change", updateSummary);
  dateInput.addEventListener("change", () => { validDate(); updateSummary(); });
  form.querySelectorAll('[name="session"]').forEach(el => el.addEventListener("change", updateSummary));

  form.addEventListener("submit", event => {
    message.textContent = "";
    if (!validDate() || !form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      return;
    }
    const riders = currentRiders();
    if (riders.length !== Number(paxInput.value) || riders.some(r =>
      !r.name || !/^\+?[0-9 ()-]{7,24}$/.test(r.phone) ||
      !Number.isFinite(Number(r.weight)) || Number(r.weight) < 20 ||
      Number(r.weight) > 250 || !r.experience)) {
      event.preventDefault();
      message.textContent = "Please complete the details for every rider.";
      return;
    }
    if (form.querySelector('[name="flowerpot"]').value.trim()) {
      event.preventDefault();
      message.textContent = "Unable to submit this booking.";
      return;
    }
    const endpoint = form.action;
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/?#]+\/exec$/.test(endpoint)) {
      event.preventDefault();
      message.textContent = "Secure checkout is not configured yet. Please call +60 19-258 4291 to book.";
      return;
    }
    updateSummary();
    submit.disabled = true;
    submit.textContent = "Preparing secure checkout…";
    message.textContent = "Saving rider details and preparing your Stripe payment.";
  });
  render();
})();
