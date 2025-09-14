// Authentication JavaScript Functions
const API_BASE_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", function () {
  // Check for redirect parameter and show appropriate message
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("redirect") === "true") {
    setTimeout(() => {
      showToast("Please log in to access the Timetable Generator", "warning");
    }, 500);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Get form elements
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  // Toast notification function (reusing from existing project)
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

  // Form validation functions
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePassword(password) {
    // At least 8 characters, one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  }

  function validateName(name) {
    return name.trim().length >= 2;
  }

  // Login form handler
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const formData = new FormData(loginForm);
      const email = formData.get("email");
      const password = formData.get("password");
      const rememberMe = formData.get("rememberMe");

      // Validation
      if (!validateEmail(email)) {
        showToast("Please enter a valid email address", "error");
        return;
      }

      if (!password || password.length < 6) {
        showToast("Password must be at least 6 characters long", "error");
        return;
      }

      // Show loading state
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Signing In...";
      submitBtn.disabled = true;

      try {
        // Make API call to login
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          // Login successful
          showToast("Login successful! Redirecting...", "success");

          // Store login state with session management
          setLoginSession(data.user, data.token, rememberMe);

          // Redirect to main application after 1 second
          setTimeout(() => {
            window.location.href = "index.html?login=success";
          }, 1000);
        } else {
          // Login failed
          showToast(data.error || "Login failed", "error");
        }
      } catch (error) {
        console.error("Login error:", error);
        showToast("Network error. Please try again.", "error");
      } finally {
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Register form handler
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const formData = new FormData(registerForm);
      const firstName = formData.get("firstName");
      const lastName = formData.get("lastName");
      const email = formData.get("email");
      const password = formData.get("password");
      const confirmPassword = formData.get("confirmPassword");
      const role = formData.get("role");
      const institution = formData.get("institution");
      const department = formData.get("department");
      const semester = formData.get("semester");

      // Validation
      if (!validateName(firstName)) {
        showToast("First name must be at least 2 characters long", "error");
        return;
      }

      if (!validateName(lastName)) {
        showToast("Last name must be at least 2 characters long", "error");
        return;
      }

      if (!validateEmail(email)) {
        showToast("Please enter a valid email address", "error");
        return;
      }

      if (!validatePassword(password)) {
        showToast(
          "Password must be at least 8 characters with letters and numbers",
          "error"
        );
        return;
      }

      if (password !== confirmPassword) {
        showToast("Passwords do not match", "error");
        return;
      }

      if (!role) {
        showToast("Please select your role", "error");
        return;
      }

      if (!institution || institution.trim().length < 2) {
        showToast(
          "Institution name must be at least 2 characters long",
          "error"
        );
        return;
      }

      // Role-specific validation
      if (role === "student" && (!department || !semester)) {
        showToast("Students must select department and semester", "error");
        return;
      }

      // Show loading state
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Creating Account...";
      submitBtn.disabled = true;

      try {
        // Prepare registration data
        const registrationData = {
          firstName,
          lastName,
          email,
          password,
          role,
          institution,
          profileData: {},
        };

        // Add role-specific profile data
        if (role === "student") {
          registrationData.profileData = {
            department,
            semester,
            facultyId: null,
          };
        } else if (role === "teacher") {
          registrationData.profileData = {
            department: department || null,
            semester: null,
            facultyId: null,
          };
        }

        // Make API call to register
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registrationData),
        });

        const data = await response.json();

        if (response.ok) {
          // Registration successful
          showToast(
            "Account created successfully! Redirecting to login...",
            "success"
          );

          // Redirect to login page after 2 seconds
          setTimeout(() => {
            window.location.href = "login.html";
          }, 2000);
        } else {
          // Registration failed
          showToast(data.error || "Registration failed", "error");
        }
      } catch (error) {
        console.error("Registration error:", error);
        showToast("Network error. Please try again.", "error");
      } finally {
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });

    // Password confirmation validation
    const passwordField = registerForm.querySelector("#password");
    const confirmPasswordField = registerForm.querySelector("#confirmPassword");

    function checkPasswordMatch() {
      if (
        confirmPasswordField.value &&
        passwordField.value !== confirmPasswordField.value
      ) {
        confirmPasswordField.setCustomValidity("Passwords do not match");
      } else {
        confirmPasswordField.setCustomValidity("");
      }
    }

    if (passwordField && confirmPasswordField) {
      passwordField.addEventListener("input", checkPasswordMatch);
      confirmPasswordField.addEventListener("input", checkPasswordMatch);
    }

    // Role-based field visibility for registration form
    const roleSelect = registerForm.querySelector("#role");
    const studentFields = document.getElementById("studentFields");
    const teacherFields = document.getElementById("teacherFields");

    if (roleSelect && studentFields && teacherFields) {
      roleSelect.addEventListener("change", function () {
        const selectedRole = this.value;

        // Hide all role-specific fields first
        studentFields.style.display = "none";
        teacherFields.style.display = "none";

        // Clear required attributes
        const studentInputs = studentFields.querySelectorAll("select");
        const teacherInputs = teacherFields.querySelectorAll("select");

        studentInputs.forEach((input) => input.removeAttribute("required"));
        teacherInputs.forEach((input) => input.removeAttribute("required"));

        // Show relevant fields based on role
        if (selectedRole === "student") {
          studentFields.style.display = "block";
          studentInputs.forEach((input) =>
            input.setAttribute("required", "required")
          );
        } else if (selectedRole === "teacher") {
          teacherFields.style.display = "block";
        }
      });
    }
  }

  // Add smooth transitions to form inputs
  const inputs = document.querySelectorAll(
    ".auth-form input, .auth-form select"
  );
  inputs.forEach((input) => {
    input.addEventListener("focus", function () {
      this.parentElement.classList.add("focused");
    });

    input.addEventListener("blur", function () {
      if (!this.value) {
        this.parentElement.classList.remove("focused");
      }
    });

    // Check if input has value on load
    if (input.value) {
      input.parentElement.classList.add("focused");
    }
  });

  // Add password visibility toggle (enhancement)
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach((input) => {
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "password-toggle";
    toggleBtn.innerHTML = "👁️";
    toggleBtn.style.cssText = `
            position: absolute;
            right: 16px;
            top: 50%;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 18px;
            opacity: 0.6;
            transition: opacity 0.3s ease;
        `;

    // Make parent relative for positioning
    input.parentElement.style.position = "relative";
    input.style.paddingRight = "50px";
    input.parentElement.appendChild(toggleBtn);

    toggleBtn.addEventListener("click", function () {
      if (input.type === "password") {
        input.type = "text";
        toggleBtn.innerHTML = "🙈";
      } else {
        input.type = "password";
        toggleBtn.innerHTML = "👁️";
      }
    });

    toggleBtn.addEventListener("mouseenter", function () {
      this.style.opacity = "1";
    });

    toggleBtn.addEventListener("mouseleave", function () {
      this.style.opacity = "0.6";
    });
  });

  // Add real-time validation feedback
  const emailInputs = document.querySelectorAll('input[type="email"]');
  emailInputs.forEach((input) => {
    input.addEventListener("input", function () {
      if (this.value && !validateEmail(this.value)) {
        this.style.borderColor = "#ef4444";
        this.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.1)";
      } else {
        this.style.borderColor = "";
        this.style.boxShadow = "";
      }
    });
  });
});

// Additional utility functions
function redirectToLogin() {
  window.location.href = "login.html";
}

function redirectToRegister() {
  window.location.href = "register.html";
}

function redirectToApp() {
  window.location.href = "index.html";
}

// Session management functions (shared with script.js)
function setLoginSession(user, token, rememberMe = false) {
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userToken", token);
  localStorage.setItem("userData", JSON.stringify(user));
  localStorage.setItem("loginTimestamp", Date.now().toString());

  if (rememberMe) {
    localStorage.setItem("rememberMe", "true");
    // Set longer session for remember me (30 days)
    localStorage.setItem(
      "sessionExpiry",
      (Date.now() + 30 * 24 * 60 * 60 * 1000).toString()
    );
  } else {
    // Default session (24 hours)
    localStorage.setItem(
      "sessionExpiry",
      (Date.now() + 24 * 60 * 60 * 1000).toString()
    );
  }
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

function getCurrentUser() {
  const userData = localStorage.getItem("userData");
  return userData ? JSON.parse(userData) : null;
}

function getUserToken() {
  return localStorage.getItem("userToken");
}

// Check if user is already logged in (for demo purposes)
async function checkAuthStatus() {
  const currentPage = window.location.pathname.split("/").pop();

  if (
    (await isSessionValid()) &&
    (currentPage === "login.html" || currentPage === "register.html")
  ) {
    // User is already logged in, redirect to main app
    showToast("You are already logged in. Redirecting...", "info");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  }
}

// Enhanced authentication protection for main app
async function requireAuthenticationForIndex() {
  const currentPage = window.location.pathname.split("/").pop();

  // Check if we're trying to access the main app without being logged in
  if (
    (currentPage === "index.html" || currentPage === "") &&
    !(await isSessionValid())
  ) {
    // Clear any existing auth data to be safe
    clearAuthData();

    // Redirect to login with a message
    window.location.href = "login.html?redirect=true";
    return false;
  }

  return true;
}

// Run auth check on page load
document.addEventListener("DOMContentLoaded", checkAuthStatus);
