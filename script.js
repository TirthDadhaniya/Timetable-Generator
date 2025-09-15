// Tab switching functionality
const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    // Remove active class from all tabs
    tabs.forEach((t) => t.classList.remove("active"));

    // Add active class to clicked tab
    tab.classList.add("active");

    // Hide all tab contents
    tabContents.forEach((content) => content.classList.add("hidden"));

    // Show the selected tab content
    const tabId = tab.id.replace("-tab", "-content");
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
      targetContent.classList.remove("hidden");
    }
  });
});

// Enhanced authentication protection
async function requireAuthentication() {
  const currentPage = window.location.pathname.split("/").pop();
  const urlParams = new URLSearchParams(window.location.search);

  // Check if we're on the main index page
  if (currentPage === "index.html" || currentPage === "") {
    // Check if this is an authorized access
    const isAuthorizedAccess = urlParams.get("authorized") === "true";

    if (!isAuthorizedAccess) {
      // Not authorized, redirect to welcome page
      window.location.replace("welcome.html");
      return false;
    }

    // Check session validity for returning users
    if (!(await isSessionValid())) {
      // Not logged in, redirect to login page
      window.location.href = "login.html?redirect=true";
      return false;
    }
  }

  return true; // User is authenticated or on a public page
}
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
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? `http://${window.location.hostname}:3000`
      : window.location.origin;

  const token = getUserToken();
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  fetch(`${API_BASE}/api/timetables`, { headers })
    .then((response) => {
      if (response.status === 401) {
        // Token expired or invalid
        clearAuthData();
        window.location.href = "login.html?redirect=true";
        return;
      }
      return response.json();
    })
    .then((savedTimetables) => {
      if (savedTimetables) {
        const count = savedTimetables ? savedTimetables.length : 0;
        animateCount("total-timetables-count", count);
      }
    })
    .catch((error) => {
      console.error("Error fetching timetables count:", error);
      animateCount("total-timetables-count", 0);
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
// Using API_BASE_URL already declared in auth.js

// Authentication helper functions (shared with auth.js)
function getCurrentUser() {
  const userData = localStorage.getItem("userData");
  return userData ? JSON.parse(userData) : null;
}

function getUserToken() {
  return localStorage.getItem("userToken");
}

async function isSessionValid() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const token = localStorage.getItem("userToken");
  const sessionExpiry = localStorage.getItem("sessionExpiry");

  if (isLoggedIn !== "true" || !token || !sessionExpiry) {
    return false;
  }

  const currentTime = Date.now();
  const expiryTime = parseInt(sessionExpiry);

  if (currentTime > expiryTime) {
    // Session expired, clear all auth data
    clearAuthData();
    return false;
  }

  // Verify token with server
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
        // Update user data if needed
        localStorage.setItem("userData", JSON.stringify(data.user));
        return true;
      }
    }
  } catch (error) {
    console.error("Token verification error:", error);
  }

  // Token invalid, clear auth data
  clearAuthData();
  return false;
}

function clearAuthData() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("rememberMe");
  localStorage.removeItem("registeredUser");
  localStorage.removeItem("loginTimestamp");
  localStorage.removeItem("sessionExpiry");
}

async function checkAuthenticationStatus() {
  const currentUser = getCurrentUser();
  const token = getUserToken();

  const userInfo = document.getElementById("userInfo");
  const authButtons = document.getElementById("authButtons");
  const userName = document.getElementById("userName");

  if (currentUser && token && (await isSessionValid())) {
    // User is logged in and session is valid
    if (userInfo) userInfo.style.display = "flex";
    if (authButtons) authButtons.style.display = "none";

    // Set user name and role
    if (userName) {
      userName.textContent = `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`;
    }

    // Update UI based on user role
    updateUIForUserRole(currentUser.role);
  } else {
    // User is not logged in or session is invalid
    clearAuthData();
    window.location.href = "login.html?redirect=true";
  }
}

function updateUIForUserRole(role) {
  // Hide/show elements based on user role
  const adminOnlyElements = document.querySelectorAll(".admin-only");
  const teacherElements = document.querySelectorAll(".teacher-only");
  const studentElements = document.querySelectorAll(".student-only");

  // Hide all role-specific elements first
  adminOnlyElements.forEach((el) => (el.style.display = "none"));
  teacherElements.forEach((el) => (el.style.display = "none"));
  studentElements.forEach((el) => (el.style.display = "none"));

  // Show elements based on role
  switch (role) {
    case "admin":
      adminOnlyElements.forEach((el) => (el.style.display = "block"));
      break;
    case "teacher":
      teacherElements.forEach((el) => (el.style.display = "block"));
      // Also show elements that are for both teacher and student
      document.querySelectorAll(".teacher-only.student-only").forEach((el) => (el.style.display = "block"));
      break;
    case "student":
      studentElements.forEach((el) => (el.style.display = "block"));
      // Also show elements that are for both teacher and student
      document.querySelectorAll(".teacher-only.student-only").forEach((el) => (el.style.display = "block"));
      break;
  }

  // Update navigation based on role
  updateNavigationForRole(role);
}

function updateNavigationForRole(role) {
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach((tab) => {
    const tabId = tab.id;

    // Define which tabs are available for each role
    switch (role) {
      case "admin":
        // Admin can see all tabs
        tab.style.display = "block";
        break;
      case "teacher":
        // Teachers can only see timetable tab
        if (tabId === "timetable-tab") {
          tab.style.display = "block";
        } else {
          tab.style.display = "none";
        }
        break;
      case "student":
        // Students can only see timetable tab
        if (tabId === "timetable-tab") {
          tab.style.display = "block";
        } else {
          tab.style.display = "none";
        }
        break;
    }
  });

  // If current tab is hidden, switch to timetable tab
  const activeTab = document.querySelector(".tab.active");
  if (activeTab && activeTab.style.display === "none") {
    const timetableTab = document.getElementById("timetable-tab");
    if (timetableTab) {
      timetableTab.click();
    }
  }
}

async function handleLogout() {
  const token = getUserToken();

  if (token) {
    try {
      // Call logout API
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Logout API error:", error);
    }
  }

  // Clear authentication data
  clearAuthData();

  // Show toast notification
  showToast("Logged out successfully", "success");

  // Redirect to login page
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1500);
}

// Enhanced authentication protection
async function requireAuthentication() {
  const currentPage = window.location.pathname.split("/").pop();

  // Check if we're on the main index page
  if (currentPage === "index.html" || currentPage === "") {
    // Check session validity
    if (!(await isSessionValid())) {
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

// Initialize authentication status on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Page loaded, checking authentication...");

  // First protect the page content
  if (!(await requireAuthentication())) {
    console.log("User not authenticated, redirecting to login");
    return;
  }

  console.log("User is authenticated, proceeding normally");

  // If user is authenticated, proceed normally
  await checkAuthenticationStatus();

  // Check for login redirect
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("login") === "success") {
    const currentUser = getCurrentUser();
    const welcomeMessage = currentUser
      ? `Welcome, ${currentUser.firstName}! You have successfully logged in as ${currentUser.role}.`
      : "Welcome! You have successfully logged in.";
    showToast(welcomeMessage, "success");
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

// Export functions to global scope for access from other files
window.getCurrentUser = getCurrentUser;
window.updateUIForUserRole = updateUIForUserRole;
