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

    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/?#]+\/exec$/.test(endpoint)) {
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
      paymentStatus: "Pending Stripe verification",
    };

    try {
      sessionStorage.setItem(
        "dkandangMembershipRegistration",
        JSON.stringify(registration),
      );
    } catch (_) {}

    // Allow the browser's normal POST to Apps Script.
    // Apps Script creates a Stripe Checkout Session then records the registration.
    memberSubmitButton.disabled = true;
    memberSubmitButton.textContent = "Saving registration…";
    memberMessage.textContent =
      "Saving your membership registration before opening payment…";
  });
}

