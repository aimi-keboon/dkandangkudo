// Mobile navigation
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("active");

    navToggle.classList.toggle("active", isOpen);
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    navToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu",
    );
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navLinks.classList.contains("active")) {
      navLinks.classList.remove("active");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open navigation menu");
      navToggle.focus();
    }
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("active");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open navigation menu");
    });
  });

  document.addEventListener("click", (e) => {
    if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove("active");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open navigation menu");
    }
  });
}

// Footer year
document.querySelectorAll("#year").forEach((el) => {
  el.textContent = new Date().getFullYear();
});
// Membership registration
const memberForm = document.getElementById("memberForm");
if (memberForm) {
  const memberMessage = document.getElementById("formMessage");
  const memberFlowerpot = memberForm.querySelector('[name="flowerpot"]');
  const memberSubmitButton = memberForm.querySelector('button[type="submit"]');

  memberForm.addEventListener("submit", (e) => {
    const endpoint = memberForm.getAttribute("action") || "";

    if (!memberForm.checkValidity()) {
      e.preventDefault();
      memberForm.reportValidity();
      return;
    }

    // Client-side convenience check. Apps Script repeats this server-side.
    if (memberFlowerpot && memberFlowerpot.value.trim() !== "") {
      e.preventDefault();
      memberMessage.textContent = "Unable to submit this registration.";
      return;
    }

    if (!endpoint || endpoint.startsWith("YOUR_")) {
      e.preventDefault();
      memberMessage.textContent =
        "Add your deployed Google Apps Script Web App URL to membership.html before launch.";
      return;
    }

    const registration = {
      name: document.getElementById("name").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      email: document.getElementById("email").value.trim(),
      experience: document.getElementById("experience").value,
      paymentStatus: "Pending manual verification",
    };

    try {
      sessionStorage.setItem(
        "dkandangMembershipRegistration",
        JSON.stringify(registration),
      );
    } catch (_) {}

    // Allow the browser's normal POST to Apps Script.
    // Apps Script records the registration first, then presents/opens Stripe.
    memberSubmitButton.disabled = true;
    memberSubmitButton.textContent = "Saving registration…";
    memberMessage.textContent =
      "Saving your membership registration before opening payment…";
  });
}

// Public / non-member outride booking form
const publicBookingForm = document.getElementById("publicBookingForm");
if (publicBookingForm) {
  const dateInput = document.getElementById("rideDate");
  const paxInput = document.getElementById("pax");
  const bookingTotal = document.getElementById("bookingTotal");
  const paxPriceText = document.getElementById("paxPriceText");
  const calculatedTotal = document.getElementById("calculatedTotal");
  const selectedSessionText = document.getElementById("selectedSessionText");
  const bookingMessage = document.getElementById("bookingMessage");
  const rideDateHint = document.getElementById("rideDateHint");
  const flowerpot = publicBookingForm.querySelector('[name="flowerpot"]');
  const submitButton = publicBookingForm.querySelector('button[type="submit"]');

  // Prevent selecting past dates using the visitor's local calendar date.
  const now = new Date();
  const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

  dateInput.min = localToday;

  // D'Kandang Kudo Stable is closed every Monday.
  const validateRideDate = () => {
    const isMonday = Boolean(dateInput.value) &&
      new Date(dateInput.value + "T12:00:00").getDay() === 1;
    dateInput.setCustomValidity(
      isMonday ? "We're closed every Monday. Please choose another date." : "",
    );
    dateInput.setAttribute("aria-invalid", isMonday ? "true" : "false");
    rideDateHint.textContent = isMonday
      ? "We're closed every Monday. Please choose another date."
      : "Closed on Mondays. Dates and sessions are subject to confirmation.";
    rideDateHint.classList.toggle("field-error", isMonday);
    return !isMonday;
  };

  dateInput.addEventListener("change", () => {
    if (!validateRideDate()) dateInput.reportValidity();
    updateSummary();
  });

  const updateSummary = () => {
    const selected = publicBookingForm.querySelector(
      'input[name="session"]:checked',
    );
    const rawPax = Number.parseInt(paxInput.value, 10);
    const pax = Number.isFinite(rawPax) && rawPax > 0 ? rawPax : 1;
    const total = pax * 250;

    bookingTotal.textContent = `RM${total.toLocaleString()} total`;
    paxPriceText.textContent = `${pax} pax × RM250`;
    calculatedTotal.value = String(total);

    if (!dateInput.value && !selected) {
      selectedSessionText.textContent = "Choose a date and session above.";
      return;
    }

    let text = "";

    if (dateInput.value) {
      const d = new Date(dateInput.value + "T00:00:00");
      text += d.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    if (selected) {
      text += (text ? " · " : "") + selected.value;
    }

    selectedSessionText.textContent = text;
  };
  paxInput.addEventListener("input", updateSummary);

  publicBookingForm.querySelectorAll('input[name="session"]').forEach((el) => {
    el.addEventListener("change", updateSummary);
  });

  publicBookingForm.addEventListener("submit", (e) => {
    const endpoint = publicBookingForm.getAttribute("action") || "";

    if (!validateRideDate() || !publicBookingForm.checkValidity()) {
      e.preventDefault();
      publicBookingForm.reportValidity();
      return;
    }

    // Client-side convenience check. Apps Script repeats this server-side.
    if (flowerpot && flowerpot.value.trim() !== "") {
      e.preventDefault();
      bookingMessage.textContent = "Unable to submit this booking.";
      return;
    }

    if (!endpoint || endpoint.startsWith("YOUR_")) {
      e.preventDefault();
      bookingMessage.textContent =
        "Add your deployed Google Apps Script Web App URL to booking.html before launch.";
      return;
    }

    const selected = publicBookingForm.querySelector(
      'input[name="session"]:checked',
    );
    const rawPax = Number.parseInt(paxInput.value, 10);
    const pax = Number.isFinite(rawPax) && rawPax > 0 ? rawPax : 1;

    const booking = {
      name: document.getElementById("bookingName").value.trim(),
      phone: document.getElementById("bookingPhone").value.trim(),
      email: document.getElementById("bookingEmail").value.trim(),
      pax,
      total: pax * 250,
      date: dateInput.value,
      session: selected ? selected.value : "",
      notes: document.getElementById("bookingNotes").value.trim(),
      paymentStatus: "Pending manual verification",
    };

    try {
      sessionStorage.setItem("dkandangPublicBooking", JSON.stringify(booking));
    } catch (_) {}

    // Allow the browser's normal POST to Apps Script.
    // Apps Script records the booking first, then presents/opens Stripe.
    submitButton.disabled = true;
    submitButton.textContent = "Saving booking…";
    bookingMessage.textContent = "Saving your booking before opening payment…";
  });

  updateSummary();
}
