// Tab switching functionality
const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tabContents.forEach((content) => content.classList.add("hidden"));
    tab.classList.add("active");
    const tabId = tab.id.replace("-tab", "-content");
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
      targetContent.classList.remove("hidden");
    }
  });
});
document.addEventListener("DOMContentLoaded", () => {
  // Add event listeners for automatic total calculation
  const lectureHoursInput = document.getElementById("lectureHours");
  const labHoursInput = document.getElementById("labHours");
  const labDurationSelect = document.getElementById("labDuration");
  const totalHoursInput = document.getElementById("totalHours");

  function calculateTotal() {
    const lecture = parseInt(lectureHoursInput.value) || 0;
    const lab = parseInt(labHoursInput.value) || 0;
    totalHoursInput.value = lecture + lab;
  }

  function handleLabHoursChange() {
    const labHours = parseInt(labHoursInput.value) || 0;

    if (labHours === 0) {
      // If no lab hours, set to "No Lab" and disable the field
      labDurationSelect.value = "0";
      labDurationSelect.disabled = true;
    } else {
      // If lab hours > 0, enable the field and set default to 2 hours
      labDurationSelect.disabled = false;
      if (labDurationSelect.value === "0") {
        labDurationSelect.value = "2"; // Default to 2 hours
      }
    }
    calculateTotal();
  }

  if (lectureHoursInput && labHoursInput && labDurationSelect) {
    lectureHoursInput.addEventListener("input", calculateTotal);
    labHoursInput.addEventListener("input", handleLabHoursChange);

    // Initialize the lab duration field based on current lab hours
    handleLabHoursChange();
  }
});

// Statistics Update Functions (moved outside DOMContentLoaded to be globally accessible)
function updateStatistics() {
  updateSubjectCount();
  updateFacultyCount();
  updateTimetableCount();
}

function updateSubjectCount() {
  const subjects = getSubjects();
  const count = subjects ? subjects.length : 0;
  animateCount("total-subjects-count", count);
}

function updateFacultyCount() {
  const faculty = getFaculty();
  const count = faculty ? faculty.length : 0;
  animateCount("total-faculty-count", count);
}

function updateTimetableCount() {
  // Fetch saved timetables count directly from server for real-time accuracy
  const API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? `http://${window.location.hostname}:3000`
      : window.location.origin;

  fetch(`${API_BASE}/api/timetables`)
    .then((response) => response.json())
    .then((savedTimetables) => {
      const count = savedTimetables ? savedTimetables.length : 0;
      animateCount("total-timetables-count", count);
    })
    .catch((error) => {
      console.error("Error fetching timetables count:", error);
      // Fallback to database variable if fetch fails
      const database = typeof getDatabase === "function" ? getDatabase() : null;
      if (database && database.savedTimetables) {
        const count = database.savedTimetables.length;
        animateCount("total-timetables-count", count);
      } else {
        animateCount("total-timetables-count", 0);
      }
    });
}

// Animate number counting for better UX
function animateCount(elementId, targetValue) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const currentValue = parseInt(element.textContent) || 0;

  if (currentValue === targetValue) return;

  const increment = targetValue > currentValue ? 1 : -1;
  const timer = setInterval(() => {
    const current = parseInt(element.textContent) || 0;
    if (current === targetValue) {
      clearInterval(timer);
    } else {
      element.textContent = current + increment;
    }
  }, 50);
}

// Export updateStatistics for global access
window.updateStatistics = updateStatistics;

// Authentication functions for main app
function checkAuthenticationStatus() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const userEmail = localStorage.getItem("userEmail");
  const registeredUser = JSON.parse(
    localStorage.getItem("registeredUser") || "{}"
  );

  const userInfo = document.getElementById("userInfo");
  const authButtons = document.getElementById("authButtons");
  const userName = document.getElementById("userName");

  if (isLoggedIn === "true" && userEmail && isSessionValid()) {
    // User is logged in and session is valid
    if (userInfo) userInfo.style.display = "flex";
    if (authButtons) authButtons.style.display = "none";

    // Set user name
    if (userName) {
      if (registeredUser.firstName) {
        userName.textContent = registeredUser.firstName;
      } else {
        userName.textContent = userEmail.split("@")[0];
      }
    }
  } else {
    // User is not logged in or session is invalid
    if (userInfo) userInfo.style.display = "none";
    if (authButtons) authButtons.style.display = "flex";
  }
}

function handleLogout() {
  // Clear authentication data
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("rememberMe");
  localStorage.removeItem("registeredUser");
  localStorage.removeItem("loginTimestamp");
  localStorage.removeItem("sessionExpiry");

  // Show toast notification
  showToast("Logged out successfully", "success");

  // Update UI
  checkAuthenticationStatus();

  // Redirect to login page
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1500);
}

// Session management functions
function setLoginSession(email, rememberMe = false) {
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userEmail", email);
  localStorage.setItem("loginTimestamp", Date.now().toString());
  
  if (rememberMe) {
    localStorage.setItem("rememberMe", "true");
    // Set longer session for remember me (30 days)
    localStorage.setItem("sessionExpiry", (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
  } else {
    // Default session (24 hours)
    localStorage.setItem("sessionExpiry", (Date.now() + 24 * 60 * 60 * 1000).toString());
  }
}

function isSessionValid() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const sessionExpiry = localStorage.getItem("sessionExpiry");
  
  // If user is not logged in or no session expiry is set, return false
  if (isLoggedIn !== "true") {
    return false;
  }
  
  // If no session expiry is set, assume session is invalid
  if (!sessionExpiry) {
    return false;
  }
  
  const currentTime = Date.now();
  const expiryTime = parseInt(sessionExpiry);
  
  // Check if session has expired
  if (currentTime > expiryTime) {
    // Session expired, clear all auth data
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("rememberMe");
    localStorage.removeItem("registeredUser");
    localStorage.removeItem("loginTimestamp");
    localStorage.removeItem("sessionExpiry");
    return false;
  }
  
  return true;
}

// Enhanced authentication protection
function requireAuthentication() {
  const currentPage = window.location.pathname.split("/").pop();
  
  // Check if we're on the main index page
  if (currentPage === "index.html" || currentPage === "") {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    
    // Simple check: if not logged in, redirect immediately
    if (isLoggedIn !== "true") {
      window.location.href = "login.html?redirect=true";
      return false;
    }
    
    // If logged in but session is invalid, redirect
    if (!isSessionValid()) {
      window.location.href = "login.html?redirect=true";
      return false;
    }
  }
  
  return true; // User is authenticated or on a public page
}

// Toast notification function (matching auth.js)
function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) return;

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



// Protect the page content until authentication is verified
function protectPageContent() {
  const currentPage = window.location.pathname.split("/").pop();
  
  // Only protect index.html
  if (currentPage === "index.html" || currentPage === "") {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    
    // Check if user is not logged in at all
    if (isLoggedIn !== "true") {
      showAuthRedirectScreen();
      return false;
    }
    
    // Check if session is valid
    if (!isSessionValid()) {
      showAuthRedirectScreen();
      return false;
    }
  }
  
  return true;
}

// Helper function to show the authentication redirect screen
function showAuthRedirectScreen() {
  // Hide the main content
  const container = document.querySelector(".container");
  if (container) {
    container.style.display = "none";
  }
  
  // Show a loading/redirect message with proper styling
  document.body.innerHTML = `
    <div class="auth-redirect-screen">
      <div class="auth-redirect-card">
        <div class="auth-loading-spinner"></div>
        <h2 class="auth-redirect-title">Authentication Required</h2>
        <p class="auth-redirect-message">You need to log in to access the Timetable Generator</p>
        <p class="auth-redirect-note">Redirecting to login page...</p>
      </div>
      
      <!-- Toast Container -->
      <div id="toast-container" style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
      "></div>
    </div>
  `;
  
  // Show toast and redirect
  setTimeout(() => {
    showToast("Please log in to access the Timetable Generator", "warning");
  }, 500);
  
  setTimeout(() => {
    window.location.href = "login.html?redirect=true";
  }, 200);
}

// Initialize authentication status on page load
document.addEventListener("DOMContentLoaded", () => {
  console.log("Page loaded, checking authentication...");
  
  // Debug: Log current authentication state
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const sessionExpiry = localStorage.getItem("sessionExpiry");
  console.log("isLoggedIn:", isLoggedIn);
  console.log("sessionExpiry:", sessionExpiry);
  console.log("Current time:", Date.now());
  
  // First protect the page content
  if (!protectPageContent()) {
    console.log("Page content protected, user will be redirected");
    return;
  }
  
  console.log("User is authenticated, proceeding normally");
  
  // If user is authenticated, proceed normally
  checkAuthenticationStatus();

  // Check for login redirect
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("login") === "success") {
    showToast("Welcome! You have successfully logged in.", "success");
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Set up periodic session validation (check every 5 minutes)
  setInterval(() => {
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === "index.html" || currentPage === "") {
      if (!isSessionValid()) {
        // Session expired while user was active
        showToast("Your session has expired. Please log in again.", "warning");
        setTimeout(() => {
          window.location.href = "login.html?redirect=true";
        }, 2000);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
});
