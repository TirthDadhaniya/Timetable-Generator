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
  document.getElementById("timetable-content").classList.remove("hidden");

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
  // Count generated timetables from database
  if (database && database.generatedTimetables) {
    const count = database.generatedTimetables.length;
    animateCount("total-timetables-count", count);
  } else {
    animateCount("total-timetables-count", 0);
  }
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
