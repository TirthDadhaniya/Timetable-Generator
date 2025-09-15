// Welcome Page JavaScript Functions
const API_BASE_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", function () {
  console.log("Welcome page loaded");

  // Check if user is already logged in
  checkIfAlreadyLoggedIn();

  // Set up smooth scrolling for internal links
  setupSmoothScrolling();
});

async function checkIfAlreadyLoggedIn() {
  // Check if user has valid session
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const token = localStorage.getItem("userToken");
  const sessionExpiry = localStorage.getItem("sessionExpiry");

  if (isLoggedIn === "true" && token && sessionExpiry) {
    const currentTime = Date.now();
    const expiryTime = parseInt(sessionExpiry);

    if (currentTime < expiryTime) {
      // User has valid session, verify with server
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.valid) {
            // User is already logged in, show option to go to dashboard
            showLoggedInState(data.user);
            return;
          }
        }
      } catch (error) {
        console.log("Session verification failed:", error);
      }
    }
  }

  // User is not logged in, show normal welcome page
  showWelcomeState();
}

function showLoggedInState(user) {
  // Update the call-to-action section to show logged in state
  const ctaSection = document.querySelector(".landing-cta");
  if (ctaSection) {
    ctaSection.innerHTML = `
      <h2>Welcome back, ${user.firstName}!</h2>
      <p>
        You're already logged in as ${user.role}. Ready to continue managing your schedules?
      </p>
      <div class="cta-buttons">
        <a href="index.html?authorized=true" class="btn btn-primary">Go to Dashboard</a>
        <a href="#" onclick="logout()" class="btn btn-secondary">Logout</a>
      </div>
    `;
  }
}

function showWelcomeState() {
  // Default welcome state is already in HTML, no changes needed
  console.log("Showing welcome state for new users");
}

function setupSmoothScrolling() {
  // Add smooth scrolling behavior for any internal anchor links
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });
}

function logout() {
  // Clear all authentication data
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("rememberMe");
  localStorage.removeItem("registeredUser");
  localStorage.removeItem("loginTimestamp");
  localStorage.removeItem("sessionExpiry");

  // Show logout success message
  showToast("You have been logged out successfully", "success");

  // Redirect to welcome page after short delay
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// Toast notification function (reusing from existing project)
function showToast(message, type = "success") {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    toastContainer.setAttribute("aria-live", "polite");
    toastContainer.setAttribute("aria-label", "Notifications");
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  // Toast icons
  const icons = {
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "ℹ",
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  toastContainer.appendChild(toast);

  // Show toast
  setTimeout(() => toast.classList.add("show"), 100);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}
