// Authentication JavaScript Functions
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
    loginForm.addEventListener("submit", function (e) {
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

      // Simulate API call (replace with actual implementation)
      setTimeout(() => {
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        // For demo purposes, show success message
        showToast("Login successful! Redirecting...", "success");

        // Store login state with session management
        setLoginSession(email, rememberMe);

        // Redirect to main application after 2 seconds
        setTimeout(() => {
          window.location.href = "index.html?login=success";
        }, 200);
      }, 1500);
    });
  }

  // Register form handler
  if (registerForm) {
    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const formData = new FormData(registerForm);
      const firstName = formData.get("firstName");
      const lastName = formData.get("lastName");
      const email = formData.get("email");
      const password = formData.get("password");
      const confirmPassword = formData.get("confirmPassword");
      const role = formData.get("role");
      const institution = formData.get("institution");

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

      // Show loading state
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Creating Account...";
      submitBtn.disabled = true;

      // Simulate API call (replace with actual implementation)
      setTimeout(() => {
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        // For demo purposes, show success message
        showToast(
          "Account created successfully! Redirecting to login...",
          "success"
        );

        // Store registration data (for demo)
        localStorage.setItem(
          "registeredUser",
          JSON.stringify({
            firstName,
            lastName,
            email,
            role,
            institution,
          })
        );

        // Redirect to login page after 2 seconds
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      }, 1500);
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
function setLoginSession(email, rememberMe = false) {
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userEmail", email);
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

function isSessionValid() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const sessionExpiry = localStorage.getItem("sessionExpiry");

  if (isLoggedIn !== "true" || !sessionExpiry) {
    return false;
  }

  const currentTime = Date.now();
  const expiryTime = parseInt(sessionExpiry);

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

// Check if user is already logged in (for demo purposes)
function checkAuthStatus() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const currentPage = window.location.pathname.split("/").pop();

  if (
    isLoggedIn === "true" &&
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
function requireAuthenticationForIndex() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const currentPage = window.location.pathname.split("/").pop();

  // Check if we're trying to access the main app without being logged in
  if (
    (currentPage === "index.html" || currentPage === "") &&
    isLoggedIn !== "true"
  ) {
    // Clear any existing auth data to be safe
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("rememberMe");

    // Redirect to login with a message
    window.location.href = "login.html?redirect=true";
    return false;
  }

  return true;
}

// Run auth check on page load
document.addEventListener("DOMContentLoaded", checkAuthStatus);
