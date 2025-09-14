/**
 * Timetable Generator Logic
 * Handles all timetable generation, data management, and UI interactions
 */

// Authentication helper functions
function getUserToken() {
  return localStorage.getItem("userToken");
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

// Helper function for authenticated API calls
async function authenticatedFetch(url, options = {}) {
  const token = getUserToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid, redirect to login
    clearAuthData();
    window.location.href = "login.html?redirect=true";
    throw new Error("Authentication required");
  }

  return response;
}

// Global variables to store database data
let database = null;
let subjects = [];
let faculty = [];
let rooms = [];
let courses = [];
let departments = [];
let courseDepartments = []; // Store course-department combinations
let semesters = [];
let roomTypes = [];

// Current generated timetable (temporary until saved)
let currentGeneratedTimetable = null;

// API Base URL - automatically detects environment
const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? `http://${window.location.hostname}:3000`
    : window.location.origin;

/**
 * ========================================
 * DATABASE AND INITIALIZATION FUNCTIONS
 * ========================================
 */

/**
 * Load database from server on page load
 */
async function loadDatabase() {
  try {
    // Use /api/data endpoint for role-based data access instead of /api/database
    const response = await authenticatedFetch(`${API_BASE}/api/data`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    database = await response.json();
    subjects = database.subjects || [];
    faculty = database.faculty || [];
    rooms = database.rooms || [];
    courseDepartments = database.courseDepartments || [];
    courses = database.courses || [];
    departments = database.departments || [];
    semesters = database.semesters || [];
    roomTypes = database.roomTypes || [];

    console.log("✅ Database loaded successfully");
    return database;
  } catch (error) {
    console.error("❌ Error loading database:", error);
    showToast("Failed to load database. Please ensure the server is running on localhost:3000", "error");
    return null;
  }
}

/**
 * Load settings from database into form fields
 */
function loadSettingsIntoForm() {
  if (database && database.settings) {
    // Note: Not loading lecturesPerDay from database to show placeholder instead
    // Users can set 0 for auto-calculation or specify their preferred number

    // Load other settings if needed (start time, end time, etc.)
    const startTimeInput = document.getElementById("collegeStartTime");
    if (startTimeInput && database.settings.defaultCollegeStartTime) {
      startTimeInput.value = database.settings.defaultCollegeStartTime;
    }

    const endTimeInput = document.getElementById("collegeEndTime");
    if (endTimeInput && database.settings.defaultCollegeEndTime) {
      endTimeInput.value = database.settings.defaultCollegeEndTime;
    }
  } // Update time calculation after loading settings
  setTimeout(updateTimeCalculation, 100); // Small delay to ensure all inputs are populated
}

/**
 * Initialize all components after database load
 */
async function initializeTimetableSystem() {
  // Show loading indicator
  showLoadingState(true);

  await loadDatabase();
  if (database) {
    populateAllDropdowns();
    renderSubjects();
    renderFaculty();
    renderRooms();
    renderCourseDepartments();
    await renderSavedTimetables();
    setupFormHandlers();
    loadSettingsIntoForm(); // Load settings like defaultSlotsPerDay into form fields

    // Update statistics after database is loaded
    if (typeof updateStatistics === "function") {
      updateStatistics();
    }

    showToast("System initialized successfully!", "success");
  } else {
    showToast("Failed to initialize system. Please refresh the page or check server connection.", "error");
  }

  // Hide loading indicator
  showLoadingState(false);
}

/**
 * ========================================
 * DROPDOWN POPULATION FUNCTIONS
 * ========================================
 */

/**
 * Populate all dropdowns with database data
 */
function populateAllDropdowns() {
  populateSubjectFormDropdowns();
  populateFacultyFormDropdowns();
  populateRoomFormDropdowns();
  populateTimetableGeneratorDropdowns();
}

/**
 * Populate subject form dropdowns
 */
function populateSubjectFormDropdowns() {
  const courseSelect = document.getElementById("subjectCourse");
  const departmentSelect = document.getElementById("subjectDepartment");
  const facultySelect = document.getElementById("assignedFaculty");
  const semesterSelect = document.getElementById("subjectSemester");

  // Populate courses (sorted alphabetically)
  const sortedCourses = [...courses].sort((a, b) => a.localeCompare(b));
  populateSelect(courseSelect, sortedCourses);

  // Add event listener for course selection to filter departments
  if (courseSelect && departmentSelect) {
    courseSelect.addEventListener("change", function () {
      const selectedCourse = this.value;
      if (selectedCourse) {
        // Filter departments based on selected course and sort alphabetically
        const filteredDepartments = courseDepartments
          .filter((cd) => cd.course === selectedCourse)
          .map((cd) => cd.department)
          .sort((a, b) => a.localeCompare(b));
        populateSelect(departmentSelect, filteredDepartments);
      } else {
        // Reset department dropdown if no course selected
        departmentSelect.innerHTML = '<option value="">Select department</option>';
      }
    });
  }

  // Initially populate all departments (sorted alphabetically)
  const sortedDepartments = [...departments].sort((a, b) => a.localeCompare(b));
  populateSelect(departmentSelect, sortedDepartments);

  // Populate semesters (already in correct order 1-8)
  populateSelect(semesterSelect, semesters);

  // Populate faculty (sorted alphabetically by name)
  const facultyOptions = faculty
    .map((f) => ({
      value: f.name,
      text: `${f.name} (${f.specialization})`,
    }))
    .sort((a, b) => a.value.localeCompare(b.value));
  populateSelect(facultySelect, facultyOptions);
}

/**
 * Populate faculty form dropdowns
 */
function populateFacultyFormDropdowns() {
  const departmentSelect = document.getElementById("facultyDepartment");
  // Sort departments alphabetically
  const sortedDepartments = [...departments].sort((a, b) => a.localeCompare(b));
  populateSelect(departmentSelect, sortedDepartments);
}

/**
 * Populate room form dropdowns
 */
function populateRoomFormDropdowns() {
  const roomTypeSelect = document.getElementById("roomType");
  // Sort room types alphabetically
  const sortedRoomTypes = [...roomTypes].sort((a, b) => a.localeCompare(b));
  populateSelect(roomTypeSelect, sortedRoomTypes);
}

/**
 * Populate timetable generator dropdowns
 */
function populateTimetableGeneratorDropdowns() {
  const genCourseSelect = document.getElementById("genCourse");
  const genDepartmentSelect = document.getElementById("genDepartment");
  const genSemesterSelect = document.getElementById("genSemester");

  // Sort courses alphabetically
  const sortedCourses = [...courses].sort((a, b) => a.localeCompare(b));
  populateSelect(genCourseSelect, sortedCourses);

  // Add event listener for course selection to filter departments
  if (genCourseSelect && genDepartmentSelect) {
    genCourseSelect.addEventListener("change", function () {
      const selectedCourse = this.value;
      if (selectedCourse) {
        // Filter departments based on selected course and sort alphabetically
        const filteredDepartments = courseDepartments
          .filter((cd) => cd.course === selectedCourse)
          .map((cd) => cd.department)
          .sort((a, b) => a.localeCompare(b));
        populateSelect(genDepartmentSelect, filteredDepartments);
      } else {
        // Reset department dropdown if no course selected
        genDepartmentSelect.innerHTML = '<option value="">Select department</option>';
      }
    });
  }

  // Sort departments alphabetically
  const sortedDepartments = [...departments].sort((a, b) => a.localeCompare(b));
  populateSelect(genDepartmentSelect, sortedDepartments);

  // Semesters are already in correct order 1-8
  populateSelect(genSemesterSelect, semesters);
}

/**
 * Helper function to populate select elements
 */
function populateSelect(selectElement, options) {
  if (!selectElement) return;

  // Clear existing options except the first one
  while (selectElement.children.length > 1) {
    selectElement.removeChild(selectElement.lastChild);
  }

  options.forEach((option) => {
    const optionElement = document.createElement("option");
    if (typeof option === "string") {
      optionElement.value = option;
      optionElement.textContent = option;
    } else {
      optionElement.value = option.value;
      optionElement.textContent = option.text;
    }
    selectElement.appendChild(optionElement);
  });
}

/**
 * ========================================
 * RENDERING FUNCTIONS
 * ========================================
 */

/**
 * Render subjects list
 */
function renderSubjects() {
  const subjectList = document.getElementById("subjectList");
  if (!subjectList) return;

  if (subjects.length === 0) {
    subjectList.innerHTML = '<p class="empty-state">No subjects added yet. Add your first subject above.</p>';
    return;
  }

  // Sort subjects by semester (1-8) first, then alphabetically by name
  const sortedSubjects = [...subjects].sort((a, b) => {
    // Extract semester number for proper numerical sorting
    const getSemesterNumber = (semester) => {
      const match = semester.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const semesterComparison = getSemesterNumber(a.semester) - getSemesterNumber(b.semester);
    if (semesterComparison !== 0) return semesterComparison;

    // If same semester, sort alphabetically by subject name
    return a.name.localeCompare(b.name);
  });

  subjectList.innerHTML = sortedSubjects
    .map(
      (subject) => `
    <div class="subject-card" data-id="${subject.id}">
      <div class="subject-card-content">
          <div class="subject-card-info">
            <div class="subject-card-title">${subject.name} <span class="subject-card-code">(${subject.code})</span></div>
            <div class="subject-card-details">Course: <b>${subject.course}</b> | Branch: <b>${subject.department}</b> | Semester: <b>${subject.semester}</b></div>
            <div class="subject-card-details">Faculty: <b>Prof. ${subject.assignedFaculty}</b></div>
            <div class="subject-card-hours">Lecture: <b>${subject.lectureHours}h</b>, Lab: <b>${subject.labHours}h</b>, Total: <b>${subject.totalHours}h/week</b></div>
          </div>
          <div class="subject-card-actions">
            <button 
            onclick="editSubject('${subject.id}')" 
            title="Edit" 
            class="card-action-btn">
            <img src="res/edit.svg" alt="Edit">
            </button>

            <button 
            onclick="deleteSubject('${subject.id}')" title="Delete" class="card-action-btn delete-btn"><img src="res/delete.svg" alt="Delete"></button>
          </div>
        </div>
    </div>
  `
    )
    .join("");
}

/**
 * Render faculty list
 */
function renderFaculty() {
  const facultyList = document.getElementById("facultyList");
  if (!facultyList) return;

  if (faculty.length === 0) {
    facultyList.innerHTML = '<p class="empty-state">No faculty added yet. Add your first faculty member above.</p>';
    return;
  }

  // Sort faculty alphabetically by name
  const sortedFaculty = [...faculty].sort((a, b) => a.name.localeCompare(b.name));

  facultyList.innerHTML = sortedFaculty
    .map(
      (f) => `
    <div class="faculty-card" data-id="${f.id}">
      <div class="faculty-card-content">
          <div class="faculty-card-info">

            <div class="faculty-card-name">${f.name} <span class="faculty-card-specialization">(${f.specialization})</span></div>
            <div class="faculty-card-department">Department: <b>${f.department}</b></div>
            <div class="faculty-card-email">Email: <b>${f.email}</b></div>
          </div>
          <div class="faculty-card-actions">
            <button onclick="editFaculty('${f.id}')" title="Edit" class="card-action-btn"><img src="res/edit.svg" alt="Edit"></button>
            <button onclick="deleteFaculty('${f.id}')" title="Delete" class="card-action-btn delete-btn"><img src="res/delete.svg" alt="Delete"></button>
          </div>
        </div>
    </div>
  `
    )
    .join("");
}

/**
 * Render rooms list
 */
function renderRooms() {
  const roomList = document.getElementById("roomList");
  if (!roomList) return;

  if (rooms.length === 0) {
    roomList.innerHTML = '<p class="empty-state">No rooms added yet. Add your first room above.</p>';
    return;
  }

  // Sort rooms numerically by room number
  const sortedRooms = [...rooms].sort((a, b) => {
    // Extract numeric part from room number for proper numerical sorting
    const getNumericValue = (roomNumber) => {
      const match = roomNumber.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };
    return getNumericValue(a.number) - getNumericValue(b.number);
  });

  roomList.innerHTML = sortedRooms
    .map(
      (room) => `
    <div class="room-card" data-id="${room.id}">
      <div class="room-card-content">
          <div class="room-card-info">
            <div class="room-card-title">${room.number} <span class="room-card-type">(${room.type})</span></div>
            <div class="room-card-details">Building: <b>${room.building}</b> | Floor: <b>${room.floor}</b></div>
            <div class="room-card-details">Capacity: <b>${room.capacity} students</b> | Equipment: <b>${
        room.equipment || "None"
      }</b></div>
          </div>
          <div class="room-card-actions">
            <button onclick="editRoom('${
              room.id
            }')" title="Edit" class="card-action-btn"><img src="res/edit.svg" alt="Edit"></button>
            <button onclick="deleteRoom('${
              room.id
            }')" title="Delete" class="card-action-btn delete-btn"><img src="res/delete.svg" alt="Delete"></button>
          </div>
        </div>
    </div>
  `
    )
    .join("");
}

/**
 * Render course-department combinations list
 */
function renderCourseDepartments() {
  const courseDepartmentList = document.getElementById("courseDepartmentList");
  if (!courseDepartmentList) return;

  if (courseDepartments.length === 0) {
    courseDepartmentList.innerHTML =
      '<p class="empty-state">No course-department combinations added yet. Add your first combination above.</p>';
    return;
  }

  // Sort course-departments alphabetically by course, then by department
  const sortedCourseDepartments = [...courseDepartments].sort((a, b) => {
    const courseComparison = a.course.localeCompare(b.course);
    if (courseComparison !== 0) return courseComparison;
    return a.department.localeCompare(b.department);
  });

  courseDepartmentList.innerHTML = sortedCourseDepartments
    .map((cd) => {
      // Find original index for edit/delete functions
      const originalIndex = courseDepartments.findIndex((orig) => orig.id === cd.id);
      return `
    <div class="course-department-card" data-index="${originalIndex}">
      <div class="course-department-card-content">
          <div class="course-department-card-info">
            <div class="course-department-card-name">${cd.course} - ${cd.department}</div>
            <div class="course-department-card-details">Course: <b>${cd.course}</b> | Department: <b>${cd.department}</b></div>
          </div>
          <div class="course-department-card-actions">
            <button onclick="editCourseDepartment(${originalIndex})" title="Edit" class="card-action-btn"><img src="res/edit.svg" alt="Edit"></button>
            <button onclick="deleteCourseDepartment(${originalIndex})" title="Delete" class="card-action-btn delete-btn"><img src="res/delete.svg" alt="Delete"></button>
          </div>
        </div>
    </div>
  `;
    })
    .join("");
}

/**
 * ========================================
 * FORM HANDLING FUNCTIONS
 * ========================================
 */

/**
 * Setup all form event handlers
 */
function setupFormHandlers() {
  // Subject form
  const subjectForm = document.getElementById("subjectForm");
  if (subjectForm) {
    subjectForm.addEventListener("submit", handleSubjectFormSubmission);
  }

  // Faculty form
  const facultyForm = document.getElementById("facultyForm");
  if (facultyForm) {
    facultyForm.addEventListener("submit", handleFacultyFormSubmission);
  }

  // Room form
  const roomForm = document.getElementById("roomForm");
  if (roomForm) {
    roomForm.addEventListener("submit", handleRoomFormSubmission);
  }

  // Course form
  const courseForm = document.getElementById("courseForm");
  if (courseForm) {
    courseForm.addEventListener("submit", handleCourseFormSubmission);
  }

  // Timetable generation form
  const timetableGenForm = document.getElementById("timetableGenForm");
  if (timetableGenForm) {
    timetableGenForm.addEventListener("submit", handleTimetableGeneration);
  }

  // Break checkbox handler
  const hasBreakCheckbox = document.getElementById("hasBreak");
  const breakStartTimeInput = document.getElementById("breakStartTime");
  const breakEndTimeInput = document.getElementById("breakEndTime");

  if (hasBreakCheckbox && breakStartTimeInput && breakEndTimeInput) {
    hasBreakCheckbox.addEventListener("change", function () {
      const isEnabled = this.checked;
      breakStartTimeInput.disabled = !isEnabled;
      breakEndTimeInput.disabled = !isEnabled;

      // If enabling, focus on start time field
      if (isEnabled) {
        breakStartTimeInput.focus();
      }
    });
  }

  // Lectures per day handler - update database setting when changed
  const lecturesPerDayInput = document.getElementById("lecturesPerDay");
  if (lecturesPerDayInput) {
    lecturesPerDayInput.addEventListener("change", async function () {
      const newValue = parseInt(this.value);
      if (!isNaN(newValue) && newValue >= 0 && newValue <= 12) {
        try {
          const response = await fetch("/api/settings", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              defaultSlotsPerDay: newValue,
            }),
          });

          if (response.ok) {
            console.log(`✅ Updated defaultSlotsPerDay to ${newValue}`);
          } else {
            console.error("❌ Failed to update settings");
          }
        } catch (error) {
          console.error("❌ Error updating settings:", error);
        }
      }
    });
  }

  // Update time calculation display when inputs change
  updateTimeCalculation();

  // Add event listeners to update calculation in real-time
  const inputs = [
    "collegeStartTime",
    "collegeEndTime",
    "slotDuration",
    "lecturesPerDay",
    "breakStartTime",
    "breakEndTime",
    "hasBreak",
  ];
  inputs.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("change", updateTimeCalculation);
      element.addEventListener("input", updateTimeCalculation);
    }
  });
}

/**
 * Update the time configuration summary display
 */
function updateTimeCalculation() {
  const startTime = document.getElementById("collegeStartTime")?.value || "09:00";
  const endTime = document.getElementById("collegeEndTime")?.value || "17:00";
  const slotDuration = parseInt(document.getElementById("slotDuration")?.value) || 60;
  const lecturesPerDay = parseInt(document.getElementById("lecturesPerDay")?.value) || 0;
  const hasBreak = document.getElementById("hasBreak")?.checked || false;
  const breakStartTime = document.getElementById("breakStartTime")?.value || "12:00";
  const breakEndTime = document.getElementById("breakEndTime")?.value || "13:00";

  const timeDetailsDiv = document.getElementById("timeDetails");
  if (!timeDetailsDiv) return;

  try {
    // Calculate total available time
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    const totalMinutes = (end - start) / (1000 * 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;

    // Calculate break time
    let breakTimeNeeded = 0;
    if (hasBreak && breakStartTime && breakEndTime) {
      const breakStart = new Date(`1970-01-01T${breakStartTime}:00`);
      const breakEnd = new Date(`1970-01-01T${breakEndTime}:00`);
      breakTimeNeeded = (breakEnd - breakStart) / (1000 * 60);
    }
    const breakHours = Math.floor(breakTimeNeeded / 60);
    const breakMins = breakTimeNeeded % 60;

    // Check if auto-calculation would be triggered
    const isAutoMode = lecturesPerDay === 0;
    let displayLecturesPerDay = lecturesPerDay;

    if (isAutoMode) {
      // Get current form values for auto-calculation preview
      const course = document.getElementById("genCourse")?.value;
      const department = document.getElementById("genDepartment")?.value;
      const semester = document.getElementById("genSemester")?.value;

      if (course && department && semester) {
        const mockParams = {
          course,
          department,
          semester,
          startTime,
          endTime,
          slotDuration,
          hasBreak,
          breakStartTime: hasBreak ? breakStartTime : null,
          breakEndTime: hasBreak ? breakEndTime : null,
        };
        displayLecturesPerDay = calculateOptimalLecturesPerDay(mockParams);
      } else {
        displayLecturesPerDay = "?";
      }
    }

    const lectureTimeNeeded = displayLecturesPerDay !== "?" ? displayLecturesPerDay * slotDuration : 0;
    const lectureHours = Math.floor(lectureTimeNeeded / 60);
    const lectureMins = lectureTimeNeeded % 60;

    // Calculate remaining time
    const remainingTime = totalMinutes - lectureTimeNeeded - breakTimeNeeded;
    const remainingHours = Math.floor(Math.abs(remainingTime) / 60);
    const remainingMins = Math.abs(remainingTime) % 60;

    let html = `
      <div style="margin-bottom: 5px;">
        📅 <strong>Total College Time:</strong> ${totalHours}h ${totalMins}m (${convertTo12HourFormat(
      startTime
    )} - ${convertTo12HourFormat(endTime)})
      </div>
      <div style="margin-bottom: 5px;">
        📚 <strong>Lecture Time Needed:</strong> ${displayLecturesPerDay} slots × ${slotDuration}min = ${lectureHours}h ${lectureMins}m
      </div>
    `;

    if (hasBreak) {
      html += `
        <div style="margin-bottom: 5px;">
          🍽️ <strong>Break Time:</strong> ${breakHours}h ${breakMins}m (${convertTo12HourFormat(
        breakStartTime
      )} - ${convertTo12HourFormat(breakEndTime)})
        </div>
      `;
    }

    if (remainingTime >= 0) {
      html += `
        <div style="color: #059669;">
          ✅ <strong>Remaining Time:</strong> ${remainingHours}h ${remainingMins}m available
        </div>
      `;
    } else {
      html += `
        <div style="color: #dc2626;">
          ❌ <strong>Time Shortage:</strong> Need ${remainingHours}h ${remainingMins}m more time
        </div>
      `;
    }

    timeDetailsDiv.innerHTML = html;
  } catch (error) {
    timeDetailsDiv.innerHTML = '<div style="color: #dc2626;">Error calculating time configuration</div>';
  }
}

/**
 * Handle subject form submission
 */
async function handleSubjectFormSubmission(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const subjectData = {
    name: formData.get("subjectName"),
    code: formData.get("subjectCode"),
    course: formData.get("subjectCourse"),
    department: formData.get("subjectDepartment"),
    lectureHours: parseInt(formData.get("lectureHours")) || 0,
    labHours: parseInt(formData.get("labHours")) || 0,
    labDuration: parseInt(formData.get("labDuration")) || 0,
    totalHours: parseInt(formData.get("totalHours")) || 0,
    assignedFaculty: formData.get("assignedFaculty"),
    semester: formData.get("subjectSemester"),
  };

  // Validation
  if (!validateSubjectData(subjectData)) {
    return;
  }

  // Check if this is an edit operation
  const editId = event.target.dataset.editId;
  let isEdit = !!editId;

  // If not in edit mode, check for duplicate subject code and auto-update if found
  let existingSubject = null;
  if (!isEdit) {
    existingSubject = subjects.find((s) => s.code === subjectData.code);
    if (existingSubject) {
      // Auto-switch to edit mode for existing subject
      event.target.dataset.editId = existingSubject.id;
      isEdit = true;
      showToast("Subject code exists. Updating existing subject...", "info");
    }
  }

  const finalEditId = event.target.dataset.editId || editId;

  try {
    const url = isEdit ? `${API_BASE}/api/subjects/${finalEditId}` : `${API_BASE}/api/subjects`;
    const method = isEdit ? "PUT" : "POST";

    const response = await authenticatedFetch(url, {
      method: method,
      body: JSON.stringify(subjectData),
    });

    if (response.ok) {
      const updatedSubject = await response.json();

      if (isEdit) {
        // Update existing subject
        const index = subjects.findIndex((s) => s.id === finalEditId);
        if (index !== -1) {
          subjects[index] = updatedSubject;
        }
        showToast("Subject updated successfully!", "success");

        // Reset form to add mode
        delete event.target.dataset.editId;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.textContent = "Add Subject";
        }
      } else {
        // Add new subject
        subjects.push(updatedSubject);
        showToast("Subject added successfully!", "success");
      }

      renderSubjects();
      event.target.reset();

      if (typeof updateStatistics === "function") {
        updateStatistics();
      }
    } else {
      throw new Error(`Failed to ${isEdit ? "update" : "add"} subject`);
    }
  } catch (error) {
    console.error(`Error ${isEdit ? "updating" : "adding"} subject:`, error);
    showToast(`Failed to ${isEdit ? "update" : "add"} subject. Please try again.`, "error");
  }
}

/**
 * Handle faculty form submission
 */
async function handleFacultyFormSubmission(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const facultyData = {
    name: formData.get("facultyName"),
    specialization: formData.get("facultySpecialization"),
    department: formData.get("facultyDepartment"),
    email: formData.get("facultyEmail"),
  };

  // Validation
  if (!validateFacultyData(facultyData)) {
    return;
  }

  // Check if this is an edit operation
  const editId = event.target.dataset.editId;
  let isEdit = !!editId;

  // If not in edit mode, check for duplicate email and auto-update if found
  let existingFaculty = null;
  if (!isEdit) {
    existingFaculty = faculty.find((f) => f.email === facultyData.email);
    if (existingFaculty) {
      // Auto-switch to edit mode for existing faculty
      event.target.dataset.editId = existingFaculty.id;
      isEdit = true;
      showToast("Faculty email exists. Updating existing faculty...", "info");
    }
  }

  const finalEditId = event.target.dataset.editId || editId;

  try {
    const url = isEdit ? `${API_BASE}/api/faculty/${finalEditId}` : `${API_BASE}/api/faculty`;
    const method = isEdit ? "PUT" : "POST";

    const response = await authenticatedFetch(url, {
      method: method,
      body: JSON.stringify(facultyData),
    });

    if (response.ok) {
      const updatedFaculty = await response.json();

      if (isEdit) {
        // Update existing faculty
        const index = faculty.findIndex((f) => f.id === finalEditId);
        if (index !== -1) {
          faculty[index] = updatedFaculty;
        }
        showToast("Faculty updated successfully!", "success");

        // Reset form to add mode
        delete event.target.dataset.editId;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.textContent = "Add Faculty";
        }
      } else {
        // Add new faculty
        faculty.push(updatedFaculty);
        showToast("Faculty added successfully!", "success");
      }

      renderFaculty();
      populateSubjectFormDropdowns(); // Refresh faculty dropdown in subject form
      event.target.reset();

      if (typeof updateStatistics === "function") {
        updateStatistics();
      }
    } else {
      throw new Error(`Failed to ${isEdit ? "update" : "add"} faculty`);
    }
  } catch (error) {
    console.error(`Error ${isEdit ? "updating" : "adding"} faculty:`, error);
    showToast(`Failed to ${isEdit ? "update" : "add"} faculty. Please try again.`, "error");
  }
}

/**
 * Handle room form submission
 */
async function handleRoomFormSubmission(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const roomData = {
    number: formData.get("roomNumber"),
    type: formData.get("roomType"),
    building: formData.get("roomBuilding"),
    floor: formData.get("roomFloor"),
    capacity: parseInt(formData.get("roomCapacity")) || 0,
    equipment: formData.get("roomEquipment") || "",
  };

  // Validation
  if (!validateRoomData(roomData)) {
    return;
  }

  // Check if this is an edit operation
  const editId = event.target.dataset.editId;
  let isEdit = !!editId;

  // If not in edit mode, check for duplicate room number and auto-update if found
  let existingRoom = null;
  if (!isEdit) {
    existingRoom = rooms.find((r) => r.number === roomData.number);
    if (existingRoom) {
      // Auto-switch to edit mode for existing room
      event.target.dataset.editId = existingRoom.id;
      isEdit = true;
      showToast("Room number exists. Updating existing room...", "info");
    }
  }

  const finalEditId = event.target.dataset.editId || editId;

  try {
    const url = isEdit ? `${API_BASE}/api/rooms/${finalEditId}` : `${API_BASE}/api/rooms`;
    const method = isEdit ? "PUT" : "POST";

    const response = await authenticatedFetch(url, {
      method: method,
      body: JSON.stringify(roomData),
    });

    if (response.ok) {
      const updatedRoom = await response.json();

      if (isEdit) {
        // Update existing room
        const index = rooms.findIndex((r) => r.id === finalEditId);
        if (index !== -1) {
          rooms[index] = updatedRoom;
        }
        showToast("Room updated successfully!", "success");

        // Reset form to add mode
        delete event.target.dataset.editId;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.textContent = "Add Room";
        }
      } else {
        // Add new room
        rooms.push(updatedRoom);
        showToast("Room added successfully!", "success");
      }

      renderRooms();
      event.target.reset();

      if (typeof updateStatistics === "function") {
        updateStatistics();
      }
    } else {
      throw new Error(`Failed to ${isEdit ? "update" : "add"} room`);
    }
  } catch (error) {
    console.error(`Error ${isEdit ? "updating" : "adding"} room:`, error);
    showToast(`Failed to ${isEdit ? "update" : "add"} room. Please try again.`, "error");
  }
}

/**
 * Handle course form submission
 */
async function handleCourseFormSubmission(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const courseData = {
    course: formData.get("courseName"),
    department: formData.get("departmentName"),
  };

  // Validation
  if (!validateCourseDepartmentData(courseData)) {
    return;
  }

  // Check if this is an edit operation
  const editIndex = event.target.dataset.editIndex;
  let isEdit = editIndex !== undefined;

  try {
    let url, method;

    if (isEdit) {
      url = `${API_BASE}/api/course-departments/${editIndex}`;
      method = "PUT";
    } else {
      url = `${API_BASE}/api/course-departments`;
      method = "POST";
    }

    const response = await authenticatedFetch(url, {
      method: method,
      body: JSON.stringify(courseData),
    });

    if (response.ok) {
      const result = await response.json();

      // Update individual courses and departments arrays
      if (!isEdit) {
        // Add the new course-department combination to local array
        courseDepartments.push(result);

        // Add to courses array if not already exists
        if (!courses.includes(courseData.course)) {
          courses.push(courseData.course);
        }
        // Add to departments array if not already exists
        if (!departments.includes(courseData.department)) {
          departments.push(courseData.department);
        }
        showToast("Course & Department added successfully!", "success");
      } else {
        showToast("Course & Department updated successfully!", "success");
        // Reset form to add mode
        delete event.target.dataset.editIndex;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.textContent = "Add Course & Department";
        }
      }

      renderCourseDepartments();
      populateAllDropdowns(); // Update all dropdowns with new data
      event.target.reset();

      if (typeof updateStatistics === "function") {
        updateStatistics();
      }
    } else {
      throw new Error(`Failed to ${isEdit ? "update" : "add"} course & department`);
    }
  } catch (error) {
    console.error(`Error ${isEdit ? "updating" : "adding"} course & department:`, error);
    showToast(`Failed to ${isEdit ? "update" : "add"} course & department. Please try again.`, "error");
  }
}

/**
 * Handle department form submission
 */
/**
 * ========================================
 * TIMETABLE GENERATION FUNCTIONS
 * ========================================
 */

/**
 * Check if a timetable with the same parameters already exists
 */
async function checkDuplicateTimetable(params) {
  try {
    const response = await authenticatedFetch(`${API_BASE}/api/timetables`);
    if (!response.ok) return null;
    const saved = await response.json();

    if (!saved || saved.length === 0) return null;

    // Find existing timetable with matching parameters (excluding slotDuration for backward compatibility)
    const duplicate = saved.find(
      (tt) =>
        tt.course === params.course &&
        tt.department === params.department &&
        tt.semester === params.semester &&
        tt.students === params.students &&
        tt.startTime === params.startTime &&
        tt.endTime === params.endTime
    );

    return duplicate || null;
  } catch (error) {
    console.error("Error checking for duplicate timetable:", error);
    return null;
  }
}

/**
 * Show confirmation modal for duplicate timetable
 */
function showDuplicateConfirmationModal(existingTimetable, params) {
  return new Promise((resolve) => {
    // Create modal HTML
    const modalHTML = `
      <div class="duplicate-modal-overlay" id="duplicateModal">
        <div class="duplicate-modal">
          <div class="duplicate-modal-header">
            <h3>⚠️ Duplicate Timetable Found</h3>
          </div>
          <div class="duplicate-modal-body">
            <p>A timetable with the same configuration already exists:</p>
            <div class="existing-timetable-info">
              <p><strong>Course:</strong> ${params.course}</p>
              <p><strong>Department:</strong> ${params.department}</p>
              <p><strong>Semester:</strong> ${params.semester}</p>
              <p><strong>Students:</strong> ${params.students}</p>
              <p><strong>Timing:</strong> ${params.startTime} - ${params.endTime}</p>
              <p><strong>Slot Duration:</strong> ${convertMinutesToHourFormat(params.slotDuration)}</p>
              <p><strong>Generated:</strong> ${new Date(existingTimetable.generatedAt).toLocaleDateString()}</p>
            </div>
            <p><strong>Do you want to generate a new timetable?</strong></p>
            <p class="warning-text">⚠️ This will replace the existing timetable with the same configuration.</p>
          </div>
          <div class="duplicate-modal-footer">
            <button class="btn btn-secondary" id="cancelGeneration">No, Cancel</button>
            <button class="btn btn-danger" id="replaceExisting">Yes, Replace Existing</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const modal = document.getElementById("duplicateModal");
    const cancelBtn = document.getElementById("cancelGeneration");
    const replaceBtn = document.getElementById("replaceExisting");

    // Handle cancel
    cancelBtn.addEventListener("click", () => {
      modal.remove();
      resolve(false);
    });

    // Handle replace
    replaceBtn.addEventListener("click", () => {
      modal.remove();
      resolve(true);
    });

    // Handle overlay click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    });

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        modal.remove();
        document.removeEventListener("keydown", handleEscape);
        resolve(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
  });
}

/**
 * Show confirmation modal for delete operations
 */
function showDeleteConfirmationModal(config) {
  return new Promise((resolve) => {
    const {
      title = "⚠️ Confirm Deletion",
      message = "Are you sure you want to delete this item?",
      itemDetails = "",
      confirmText = "Yes, Delete",
      cancelText = "Cancel",
    } = config;

    // Create modal HTML
    const modalHTML = `
      <div class="delete-modal-overlay" id="deleteModal">
        <div class="delete-modal">
          <div class="delete-modal-header">
            <h3>${title}</h3>
          </div>
          <div class="delete-modal-body">
            <p>${message}</p>
            ${itemDetails ? `<div class="item-details">${itemDetails}</div>` : ""}
            <p class="warning-text">⚠️ This action cannot be undone.</p>
          </div>
          <div class="delete-modal-footer">
            <button class="btn btn-secondary" id="cancelDelete">${cancelText}</button>
            <button class="btn btn-danger" id="confirmDelete">${confirmText}</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const modal = document.getElementById("deleteModal");
    const cancelBtn = document.getElementById("cancelDelete");
    const confirmBtn = document.getElementById("confirmDelete");

    // Handle cancel
    cancelBtn.addEventListener("click", () => {
      modal.remove();
      resolve(false);
    });

    // Handle confirm
    confirmBtn.addEventListener("click", () => {
      modal.remove();
      resolve(true);
    });

    // Handle overlay click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    });

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        modal.remove();
        document.removeEventListener("keydown", handleEscape);
        resolve(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
  });
}

/**
 * Delete existing timetable by ID
 */
async function deleteExistingTimetable(timetableId) {
  try {
    const response = await authenticatedFetch(`${API_BASE}/api/timetables/${timetableId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete existing timetable");
    }

    return true;
  } catch (error) {
    console.error("Error deleting existing timetable:", error);
    return false;
  }
}

/**
 * Handle timetable generation form submission
 */
async function handleTimetableGeneration(event) {
  event.preventDefault();

  const formData = new FormData(event.target);

  // Get slot duration directly in minutes from number input
  const slotDurationMinutes = parseInt(
    formData.get("slotDuration") || document.getElementById("slotDuration").value || "60"
  );

  // Handle break time data
  const hasBreak = document.getElementById("hasBreak").checked;
  let breakStartTime = null;
  let breakEndTime = null;

  if (hasBreak) {
    breakStartTime = formData.get("breakStartTime") || document.getElementById("breakStartTime").value;
    breakEndTime = formData.get("breakEndTime") || document.getElementById("breakEndTime").value;
  }

  const generationParams = {
    course: formData.get("course") || document.getElementById("genCourse").value,
    department: formData.get("department") || document.getElementById("genDepartment").value,
    semester: formData.get("semester") || document.getElementById("genSemester").value,
    students: parseInt(formData.get("students")) || parseInt(document.getElementById("genStudents").value) || 0,
    startTime: formData.get("startTime") || document.getElementById("collegeStartTime").value,
    endTime: formData.get("endTime") || document.getElementById("collegeEndTime").value,
    slotDuration: slotDurationMinutes,
    lecturesPerDay: 0, // Will be set below based on user input or auto-calculation
    hasBreak: hasBreak,
    breakStartTime: breakStartTime,
    breakEndTime: breakEndTime,
  };

  // Handle lectures per day - auto-calculate if 0 or empty, otherwise use user input
  const userLecturesPerDay =
    parseInt(formData.get("lecturesPerDay")) || parseInt(document.getElementById("lecturesPerDay").value) || 0;

  if (userLecturesPerDay === 0) {
    console.log("🤖 Auto-calculating optimal lectures per day...");
    generationParams.lecturesPerDay = calculateOptimalLecturesPerDay(generationParams);
    generationParams.isAutoCalculated = true;
    console.log(`✅ Auto-calculated: ${generationParams.lecturesPerDay} lectures per day`);
  } else {
    generationParams.lecturesPerDay = userLecturesPerDay;
    generationParams.isAutoCalculated = false;
    console.log(`👤 User specified: ${generationParams.lecturesPerDay} lectures per day`);
  }

  // Validation
  if (!validateTimetableParams(generationParams)) {
    return;
  }

  // Check for duplicate timetable
  const existingTimetable = await checkDuplicateTimetable(generationParams);

  if (existingTimetable) {
    // Show confirmation modal
    const shouldReplace = await showDuplicateConfirmationModal(existingTimetable, generationParams);

    if (!shouldReplace) {
      // User chose not to replace - cancel the operation
      const statusDiv = document.getElementById("timetableGenStatus");
      if (statusDiv) {
        statusDiv.innerHTML = '<span style="color: #f59e0b;">⚠️ Timetable generation cancelled by user</span>';
        setTimeout(() => {
          statusDiv.innerHTML = "";
        }, 3000);
      }
      return;
    }

    // User chose to replace - delete the existing timetable
    const deleteSuccess = await deleteExistingTimetable(existingTimetable.id);
    if (!deleteSuccess) {
      showToast("Failed to delete existing timetable. Please try again.", "error");
      return;
    }
  }

  // Show loading status
  const statusDiv = document.getElementById("timetableGenStatus");
  if (statusDiv) {
    statusDiv.innerHTML = '<span style="color: #667eea;">🔄 Generating timetable...</span>';
  }

  try {
    const result = await generateTimetable(generationParams);

    if (result.success) {
      displayGeneratedTimetable(result.timetable, generationParams);
      showToast("Timetable generated successfully!", "success");
      // Ensure Timetable tab is visible and smooth scroll to the generated section
      focusTimetableTabAndScroll();
      if (statusDiv) {
        statusDiv.innerHTML = '<span style="color: #10b981;">✅ Timetable generated successfully!</span>';
      }
    } else {
      showToast(result.error, "error");
      if (statusDiv) {
        statusDiv.innerHTML = `<span style="color: #ef4444;">❌ ${result.error}</span>`;
      }
    }
  } catch (error) {
    console.error("Error generating timetable:", error);
    showToast("Failed to generate timetable. Please try again.", "error");
    if (statusDiv) {
      statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Failed to generate timetable</span>';
    }
  }
}

/**
 * Main timetable generation logic
 */
async function generateTimetable(params) {
  const {
    course,
    department,
    semester,
    students,
    startTime,
    endTime,
    slotDuration = 60,
    lecturesPerDay = 6,
    hasBreak = false,
    breakStartTime = null,
    breakEndTime = null,
    isAutoCalculated = false,
  } = params;

  console.log("🔍 GenerateTimetable Debug:", {
    params,
    totalSubjects: subjects.length,
    totalRooms: rooms.length,
  });

  try {
    // Filter subjects for the selected course, department, and semester
    const filteredSubjects = subjects.filter(
      (s) => s.course === course && s.department === department && s.semester === semester
    );

    console.log("🔍 Filtered subjects:", {
      count: filteredSubjects.length,
      subjects: filteredSubjects.map((s) => ({
        name: s.name,
        faculty: s.assignedFaculty,
      })),
    });

    if (filteredSubjects.length === 0) {
      return {
        success: false,
        error: `No subjects found for ${course} - ${department} - ${semester}`,
      };
    }

    // Filter rooms that can accommodate the number of students
    const availableRooms = rooms.filter((r) => r.capacity >= students);

    if (availableRooms.length === 0) {
      return {
        success: false,
        error: `No rooms available with capacity for ${students} students`,
      };
    }

    // Generate time slots
    const timeSlots = generateTimeSlots(
      startTime,
      endTime,
      slotDuration,
      hasBreak ? breakStartTime : null,
      hasBreak ? breakEndTime : null,
      lecturesPerDay
    );

    if (timeSlots.length === 0) {
      return {
        success: false,
        error: "Invalid time range provided",
      };
    }

    // Generate the actual timetable
    const timetableResult = generateOptimizedSchedule(filteredSubjects, availableRooms, timeSlots);

    if (timetableResult.success) {
      // Save the generated timetable to database
      await saveTimetableToDatabase({
        course,
        department,
        semester,
        students,
        startTime,
        endTime,
        slotDuration,
        lecturesPerDay,
        isAutoCalculated,
        hasBreak,
        breakStartTime,
        breakEndTime,
        timetable: timetableResult.timetable,
        generatedAt: new Date().toISOString(),
      });

      return {
        success: true,
        timetable: timetableResult.timetable,
      };
    } else {
      return timetableResult;
    }
  } catch (error) {
    console.error("Error in generateTimetable:", error);
    return {
      success: false,
      error: "An unexpected error occurred during timetable generation",
    };
  }
}

/**
 * Generate time slots based on start and end time
 */
function generateTimeSlots(
  startTime,
  endTime,
  slotDuration = 60,
  breakStartTime = null,
  breakEndTime = null,
  lecturesPerDay = null
) {
  const slots = [];
  const start = new Date(`1970-01-01T${startTime}:00`);
  const end = new Date(`1970-01-01T${endTime}:00`);

  let current = new Date(start);
  let slotNumber = 1;

  // Parse break time if provided
  let breakStart = null;
  let breakEnd = null;
  if (breakStartTime && breakEndTime) {
    breakStart = new Date(`1970-01-01T${breakStartTime}:00`);
    breakEnd = new Date(`1970-01-01T${breakEndTime}:00`);
  }

  while (current < end) {
    const next = new Date(current.getTime() + slotDuration * 60 * 1000); // Add slot duration in minutes

    if (next <= end) {
      // Check if this slot overlaps with break time
      const isBreakSlot =
        breakStart &&
        breakEnd &&
        ((current >= breakStart && current < breakEnd) ||
          (next > breakStart && next <= breakEnd) ||
          (current <= breakStart && next >= breakEnd));

      if (!isBreakSlot) {
        slots.push({
          id: slotNumber,
          startTime: current.toTimeString().slice(0, 5),
          endTime: next.toTimeString().slice(0, 5),
          duration: slotDuration / 60, // Duration in hours
        });
        slotNumber++;
      }
    }
    current = next;
  }

  // Validate if the number of slots matches the desired lectures per day
  if (lecturesPerDay && slots.length !== lecturesPerDay) {
    console.warn(
      `⚠️ Time configuration mismatch: Generated ${slots.length} slots but expected ${lecturesPerDay} lectures per day`
    );
    console.warn(
      `💡 Suggestion: Adjust start/end time or slot duration to get exactly ${lecturesPerDay} lecture slots`
    );
  }

  return slots;
}

/**
 * Advanced scheduling algorithm with all the rules
 */
function generateOptimizedSchedule(subjects, availableRooms, timeSlots) {
  const workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timetable = {};

  // Initialize timetable structure
  workingDays.forEach((day) => {
    timetable[day] = {};
    timeSlots.forEach((slot) => {
      timetable[day][slot.id] = null;
    });
  });

  // Track resource usage
  const facultySchedule = {}; // Track faculty availability
  const roomSchedule = {}; // Track room usage
  const subjectScheduled = {}; // Track how many hours each subject has been scheduled
  const dailySubjectTracker = {}; // Track which subjects are scheduled on which days
  const dailyLabTracker = {}; // Track which days have labs scheduled

  // Initialize tracking objects
  subjects.forEach((subject) => {
    const labDuration = subject.labDuration || 2; // Default to 2 hours if not specified
    subjectScheduled[subject.id] = {
      lecturesScheduled: 0,
      labsScheduled: 0,
      totalLectures: subject.lectureHours,
      totalLabs: subject.labHours > 0 && labDuration > 0 ? Math.ceil(subject.labHours / labDuration) : 0, // Only calculate if both labHours and labDuration > 0
      labDuration: labDuration, // Store lab duration for later use
    };
  });

  // Initialize faculty, room, and daily tracking schedules
  workingDays.forEach((day) => {
    facultySchedule[day] = {};
    roomSchedule[day] = {};
    dailySubjectTracker[day] = new Set(); // Track subjects that have ANY activity on this day
    dailyLabTracker[day] = false; // Track if this day already has a lab
    timeSlots.forEach((slot) => {
      facultySchedule[day][slot.id] = null;
      roomSchedule[day][slot.id] = null;
    });
  });

  // Helper function to shuffle array (Fisher-Yates shuffle)
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Sort subjects by priority (more hours = higher priority) but add randomization
  const sortedSubjects = [...subjects].sort((a, b) => b.totalHours - a.totalHours);

  // First pass: Schedule labs (they have more constraints) with randomization
  const labSubjects = shuffleArray(sortedSubjects.filter((s) => s.labHours > 0 && s.labDuration > 0));

  for (const subject of labSubjects) {
    const labDuration = subject.labDuration || 2; // Default to 2 hours
    const labsToSchedule = Math.ceil(subject.labHours / labDuration);

    for (let labIndex = 0; labIndex < labsToSchedule; labIndex++) {
      let labScheduled = false;

      // Try to schedule this lab
      for (const day of workingDays) {
        if (labScheduled) break;

        // STRICT RULE: Only one lab per day - skip if this day already has a lab
        if (dailyLabTracker[day]) {
          continue;
        }

        // Don't schedule lab as first slot of the day
        for (let slotIndex = 1; slotIndex <= timeSlots.length - labDuration; slotIndex++) {
          // Get consecutive slots needed for lab duration
          const requiredSlots = [];
          let allSlotsFree = true;

          // Check if we have enough consecutive slots
          for (let i = 0; i < labDuration; i++) {
            const slot = timeSlots[slotIndex + i];
            if (!slot) {
              allSlotsFree = false;
              break;
            }
            requiredSlots.push(slot);

            // Check if slot is free
            if (
              timetable[day][slot.id] !== null ||
              facultySchedule[day][slot.id] !== null ||
              roomSchedule[day][slot.id] !== null
            ) {
              allSlotsFree = false;
              break;
            }
          }

          if (allSlotsFree && requiredSlots.length === labDuration) {
            // Find suitable room (preferably lab)
            const suitableRoom =
              availableRooms.find(
                (room) => room.type.toLowerCase().includes("lab") || room.type.toLowerCase().includes("computer")
              ) || availableRooms[0];

            if (suitableRoom) {
              // Schedule the lab session
              const labSession = {
                subject: subject.name,
                code: subject.code,
                faculty: subject.assignedFaculty,
                room: suitableRoom.number,
                type: "Lab",
                duration: labDuration,
                startTime: requiredSlots[0].startTime,
                endTime: requiredSlots[requiredSlots.length - 1].endTime,
              };

              // Place in all required slots
              requiredSlots.forEach((slot, index) => {
                const slotPosition = index === 0 ? "first" : index === requiredSlots.length - 1 ? "last" : "middle";
                timetable[day][slot.id] = { ...labSession, slotPosition };

                // Mark resources as used
                facultySchedule[day][slot.id] = subject.assignedFaculty;
                roomSchedule[day][slot.id] = suitableRoom.number;
              });

              // Mark this day as having a lab and this subject as scheduled today
              dailyLabTracker[day] = true;
              dailySubjectTracker[day].add(subject.id);

              subjectScheduled[subject.id].labsScheduled++;
              labScheduled = true;
              break;
            }
          }
        }
      }

      if (!labScheduled) {
        return {
          success: false,
          error: `Cannot schedule ${labDuration}-hour lab for subject "${subject.name}". Not enough consecutive slots or room conflicts.`,
        };
      }
    }
  }
  // Second pass: Schedule lectures with multiple attempts and randomization
  const maxPasses = 3; // Maximum number of scheduling passes

  for (let pass = 1; pass <= maxPasses; pass++) {
    console.log(`📚 Lecture scheduling pass ${pass}/${maxPasses}`);

    // Get subjects that still need lectures scheduled, randomized for each pass
    const pendingSubjects = shuffleArray(
      sortedSubjects.filter((subject) => {
        const scheduled = subjectScheduled[subject.id];
        return scheduled.lecturesScheduled < scheduled.totalLectures;
      })
    );

    if (pendingSubjects.length === 0) {
      console.log(`✅ All lectures scheduled in pass ${pass}`);
      break; // All lectures scheduled
    }

    let progressMade = false;

    // For each subject that needs more lectures
    for (const subject of pendingSubjects) {
      const scheduled = subjectScheduled[subject.id];
      const lecturesToSchedule = scheduled.totalLectures - scheduled.lecturesScheduled;

      for (let lectureIndex = 0; lectureIndex < lecturesToSchedule; lectureIndex++) {
        let lectureScheduled = false;

        // Randomize day order for better distribution
        const randomizedDays = shuffleArray(workingDays);

        // Try to distribute lectures across different days
        for (const day of randomizedDays) {
          if (lectureScheduled) break;

          // STRICT RULE: Skip this day if subject already has ANY activity (lecture/lab)
          if (dailySubjectTracker[day].has(subject.id)) {
            continue;
          }

          // Randomize slot order within the day
          const randomizedSlots = shuffleArray([...Array(timeSlots.length).keys()]);

          for (const slotIndex of randomizedSlots) {
            const slot = timeSlots[slotIndex];

            // Optional debug logging for specific subjects
            // if (lectureIndex === 0 && subject.name.includes("Applied Machine Learning")) {
            //   console.log(`🔍 Debug for ${subject.name}:`, {
            //     day,
            //     slot: slot.id,
            //     timetableSlot: timetable[day][slot.id],
            //     facultySlot: facultySchedule[day][slot.id],
            //     roomSlot: roomSchedule[day][slot.id],
            //     facultyName: subject.assignedFaculty,
            //   });
            // }

            if (
              timetable[day][slot.id] === null &&
              facultySchedule[day][slot.id] === null &&
              roomSchedule[day][slot.id] === null
            ) {
              // Find suitable room
              const suitableRoom =
                availableRooms.find(
                  (room) => room.type.toLowerCase().includes("lecture") || room.type.toLowerCase().includes("hall")
                ) || availableRooms[0];

              if (suitableRoom) {
                // Check for back-to-back lectures of same subject
                const prevSlot = slotIndex > 0 ? timeSlots[slotIndex - 1] : null;
                const nextSlot = slotIndex < timeSlots.length - 1 ? timeSlots[slotIndex + 1] : null;

                const prevSession = prevSlot ? timetable[day][prevSlot.id] : null;
                const nextSession = nextSlot ? timetable[day][nextSlot.id] : null;

                const isBackToBack =
                  (prevSession && prevSession.subject === subject.name) ||
                  (nextSession && nextSession.subject === subject.name);

                // Avoid back-to-back if possible
                if (isBackToBack && lectureIndex < lecturesToSchedule - 1) {
                  continue;
                }

                // Schedule the lecture
                const lectureSession = {
                  subject: subject.name,
                  code: subject.code,
                  faculty: subject.assignedFaculty,
                  room: suitableRoom.number,
                  type: "Lecture",
                  duration: 1,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                };

                timetable[day][slot.id] = lectureSession;
                facultySchedule[day][slot.id] = subject.assignedFaculty;
                roomSchedule[day][slot.id] = suitableRoom.number;

                // Mark this subject as scheduled today
                dailySubjectTracker[day].add(subject.id);

                subjectScheduled[subject.id].lecturesScheduled++;
                lectureScheduled = true;
                progressMade = true;
                break;
              }
            }
          }
        }

        // If we couldn't schedule this lecture, try in next pass
        if (!lectureScheduled && pass === maxPasses) {
          console.log(
            `⚠️ Could not schedule lecture ${lectureIndex + 1} for "${subject.name}" even after ${maxPasses} passes`
          );
          return {
            success: false,
            error: `Cannot schedule lecture ${lectureIndex + 1} for subject "${
              subject.name
            }" after ${maxPasses} attempts. Consider adjusting lab schedules or time slots.`,
          };
        }
      }
    }

    // If no progress was made in this pass and we still have pending lectures
    if (!progressMade && pass < maxPasses) {
      console.log(`🔄 No progress in pass ${pass}, will continue to next pass`);
    }
  }

  // Validation: Check if all subjects are properly scheduled
  for (const subject of subjects) {
    const scheduled = subjectScheduled[subject.id];
    if (scheduled.lecturesScheduled < scheduled.totalLectures || scheduled.labsScheduled < scheduled.totalLabs) {
      return {
        success: false,
        error: `Incomplete scheduling for "${subject.name}". Required: ${scheduled.totalLectures} lectures, ${scheduled.totalLabs} labs. Scheduled: ${scheduled.lecturesScheduled} lectures, ${scheduled.labsScheduled} labs.`,
      };
    }
  }

  return {
    success: true,
    timetable: timetable,
  };
}

/**
 * Generate timetable rows including break rows
 */
function generateTimetableRows(timeSlots, timetableData, workingDays, params) {
  console.log("🔍 generateTimetableRows Debug:", {
    timeSlots: timeSlots?.length,
    hasBreak: params?.hasBreak,
    breakStartTime: params?.breakStartTime,
    breakEndTime: params?.breakEndTime,
    params,
  });

  const rows = [];
  const allTimeSlots = [];

  // Create all time slots including break slots
  const start = new Date(`1970-01-01T${params.startTime}:00`);
  const end = new Date(`1970-01-01T${params.endTime}:00`);
  const slotDuration = params.slotDuration;

  // Parse break times if provided
  let breakStart = null;
  let breakEnd = null;
  if (params.hasBreak && params.breakStartTime && params.breakEndTime) {
    breakStart = new Date(`1970-01-01T${params.breakStartTime}:00`);
    breakEnd = new Date(`1970-01-01T${params.breakEndTime}:00`);
    console.log("🔍 Break times parsed:", {
      breakStartTime: params.breakStartTime,
      breakEndTime: params.breakEndTime,
      breakStart: breakStart.toTimeString(),
      breakEnd: breakEnd.toTimeString(),
    });
  }

  let current = new Date(start);

  while (current < end) {
    const next = new Date(current.getTime() + slotDuration * 60 * 1000);

    if (next <= end) {
      // Check if this slot overlaps with break time
      const isBreakTime =
        breakStart &&
        breakEnd &&
        ((current >= breakStart && current < breakEnd) ||
          (next > breakStart && next <= breakEnd) ||
          (current <= breakStart && next >= breakEnd));

      console.log(`🔍 Slot ${current.toTimeString().slice(0, 5)}-${next.toTimeString().slice(0, 5)}:`, {
        current: current.toTimeString().slice(0, 5),
        next: next.toTimeString().slice(0, 5),
        breakStart: breakStart?.toTimeString().slice(0, 5),
        breakEnd: breakEnd?.toTimeString().slice(0, 5),
        isBreakTime,
      });

      allTimeSlots.push({
        startTime: current.toTimeString().slice(0, 5),
        endTime: next.toTimeString().slice(0, 5),
        isBreak: isBreakTime,
      });
    }
    current = next;
  }

  // Generate rows for each time slot
  allTimeSlots.forEach((slot, index) => {
    console.log(`🔍 Slot ${index + 1}:`, {
      startTime: slot.startTime,
      endTime: slot.endTime,
      isBreak: slot.isBreak,
    });

    if (slot.isBreak) {
      // Generate break row
      rows.push(`
        <tr class="break-row">
          <td class="time-cell break-time">
            <div class="time-slot">
              <span class="start-time">${convertTo12HourFormat(slot.startTime)}<br />-<br /></span>
              <span class="end-time">${convertTo12HourFormat(slot.endTime)}</span>
            </div>
          </td>
          ${workingDays.map(() => '<td class="break-cell">BREAK</td>').join("")}
        </tr>
      `);
    } else {
      // Find the corresponding slot from timeSlots (which excludes break slots)
      const actualSlot = timeSlots.find((ts) => ts.startTime === slot.startTime);
      if (actualSlot) {
        rows.push(`
          <tr class="time-row">
            <td class="time-cell">
              <div class="time-slot">
                <span class="start-time">${convertTo12HourFormat(actualSlot.startTime)}<br />-<br /></span>
                <span class="end-time">${convertTo12HourFormat(actualSlot.endTime)}</span>
              </div>
            </td>
            ${workingDays
              .map((day) => {
                const session = timetableData[day] && timetableData[day][actualSlot.id.toString()];
                if (!session) {
                  return '<td class="empty-slot">Free</td>';
                }

                // Skip continuation slots of labs (already rendered in first slot)
                if (session.slotPosition && session.slotPosition !== "first") {
                  return "";
                }

                const rowspan = session.duration > 1 ? `rowspan="${session.duration}"` : "";
                const sessionClass = session.type.toLowerCase() === "lecture" ? "lecture-session" : "lab-session";

                return `
                  <td class="session-cell ${sessionClass}" ${rowspan}>
                    <div class="session-content">
                      <div class="session-subject">${session.subject}</div>
                      <div class="session-details">
                        <div class="session-faculty">👨‍🏫 ${session.faculty}</div>
                        <div class="session-room">🏢 ${session.room}</div>
                        <div class="session-type">${session.type}</div>
                      </div>
                    </div>
                  </td>
                `;
              })
              .join("")}
          </tr>
        `);
      }
    }
  });

  console.log("🔍 Final slot summary:", {
    totalSlots: allTimeSlots.length,
    breakSlots: allTimeSlots.filter((s) => s.isBreak).length,
    regularSlots: allTimeSlots.filter((s) => !s.isBreak).length,
    rowsGenerated: rows.length,
  });

  return rows;
}

/**
 * Display the generated timetable in the UI
 */
function displayGeneratedTimetable(timetableData, params) {
  const dynamicTimetable = document.getElementById("dynamic-timetable");
  const timetableTitle = document.getElementById("timetable-title");

  if (!dynamicTimetable) return;

  // Update title
  if (timetableTitle) {
    timetableTitle.textContent = `${params.course} - ${params.department} - ${params.semester}`;
  }

  // Generate timetable HTML
  // Note: generateTimeSlots excludes break periods (used for scheduling logic)
  // But generateTimetableRows creates ALL slots including break rows
  const timeSlots = generateTimeSlots(
    params.startTime,
    params.endTime,
    params.slotDuration,
    params.hasBreak ? params.breakStartTime : null,
    params.hasBreak ? params.breakEndTime : null,
    params.lecturesPerDay
  );
  const workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  let timetableHTML = `
    <div class="timetable-meta">
      <div class="meta-info">
        <p><strong>Course:</strong> ${params.course}</p>
        <p><strong>Department:</strong> ${params.department}</p>
        <p><strong>Semester:</strong> ${params.semester}</p>
        <p><strong>Students:</strong> ${params.students}</p>
        <p><strong>Timing:</strong> ${convertTo12HourFormat(params.startTime)} - ${convertTo12HourFormat(
    params.endTime
  )}</p>
        <p><strong>Slot Duration:</strong> ${Math.floor(params.slotDuration / 60)}h ${params.slotDuration % 60}m</p>
        ${
          params.hasBreak
            ? `<p><strong>Break:</strong> ${convertTo12HourFormat(params.breakStartTime)} - ${convertTo12HourFormat(
                params.breakEndTime
              )}</p>`
            : ""
        }
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
    </div>

    <div class="timetable-container">
      <table class="timetable-grid">
        <thead>
          <tr>
            <th class="time-header">Time</th>
            ${workingDays.map((day) => `<th class="day-header">${day}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${generateTimetableRows(timeSlots, timetableData, workingDays, params).join("")}
        </tbody>
      </table>
    </div>

    <div class="timetable-actions">
      <button onclick="downloadCurrentTimetable()" title="Download Timetable" class="timetable-action-btn download-btn">
        <img src="res/save-w.svg" alt="Download">
        Download Timetable
      </button>
      <button onclick="saveTimetable()" title="Save Timetable" class="timetable-action-btn save-btn admin-only">
        <img src="res/save-bold.svg" alt="Save">
        Save Timetable
      </button>
      <button onclick="deleteTimetable()" title="Delete Timetable" class="timetable-action-btn delete-btn admin-only">
        <img src="res/delete-bold.svg" alt="Delete">
        Delete Timetable
      </button>
    </div>
  `;

  // Store current timetable data globally
  currentGeneratedTimetable = {
    timetableData,
    params,
  };

  dynamicTimetable.innerHTML = timetableHTML;

  // Smooth scroll the generated timetable into view
  setTimeout(() => {
    focusTimetableTabAndScroll();
  }, 0);
}

/**
 * Save the current generated timetable to database
 */
async function saveTimetable() {
  if (!currentGeneratedTimetable) {
    showToast("No timetable to save!", "error");
    return;
  }

  try {
    const { timetableData, params } = currentGeneratedTimetable;

    const timetableToSave = {
      course: params.course,
      department: params.department,
      semester: params.semester,
      students: params.students,
      startTime: params.startTime,
      endTime: params.endTime,
      slotDuration: params.slotDuration || 60,
      lecturesPerDay: params.lecturesPerDay || 6,
      hasBreak: params.hasBreak || false,
      breakStartTime: params.breakStartTime || null,
      breakEndTime: params.breakEndTime || null,
      timetable: timetableData,
      generatedAt: new Date().toISOString(),
    };

    const response = await authenticatedFetch(`${API_BASE}/api/timetables`, {
      method: "POST",
      body: JSON.stringify(timetableToSave),
    });

    if (response.ok) {
      const savedTimetable = await response.json();
      showToast("Timetable saved successfully!", "success");

      // Update UI to show it's saved (maybe change button states)
      updateTimetableActionButtons(true, savedTimetable.id);

      console.log("✅ Timetable saved with ID:", savedTimetable.id);

      // Hide the generated timetable and restore placeholder state
      const dynamicTimetable = document.getElementById("dynamic-timetable");
      if (dynamicTimetable) {
        dynamicTimetable.innerHTML = `
          <div class="timetable-placeholder">
            <div class="placeholder-content">
              <h3>No Timetable Generated Yet</h3>
              <p>Use the Timetable Generator above to create your schedule</p>
              <div class="btn-container">
                <button onclick="scrollToGenerator()" class="btn">Generate Timetable</button>
              </div>
            </div>
          </div>
        `;
      }

      // Reset the timetable title to default
      const timetableTitle = document.getElementById("timetable-title");
      if (timetableTitle) {
        timetableTitle.textContent = "Generated Timetable";
      }

      // Clear current generated timetable since it's now saved
      currentGeneratedTimetable = null;

      // Refresh saved timetables list and scroll to it
      await renderSavedTimetables();
      scrollToSavedTimetable(savedTimetable.id);

      // Update local database with the new timetable
      if (!database.savedTimetables) {
        database.savedTimetables = [];
      }
      database.savedTimetables.push(savedTimetable);

      // Update statistics count
      if (typeof updateStatistics === "function") {
        updateStatistics();
      }
    } else {
      throw new Error("Failed to save timetable");
    }
  } catch (error) {
    console.error("Error saving timetable:", error);
    showToast("Failed to save timetable. Please try again.", "error");
  }
}

/**
 * Delete the current displayed timetable
 */
async function deleteTimetable() {
  if (!currentGeneratedTimetable) {
    showToast("No timetable to delete!", "error");
    return;
  }

  // Show confirmation modal
  const confirmed = await showDeleteConfirmationModal({
    title: "🗑️ Delete Generated Timetable",
    message: "Are you sure you want to delete this timetable?",
    itemDetails: `
      <p><strong>Course:</strong> ${currentGeneratedTimetable.params?.course || "Unknown"}</p>
      <p><strong>Department:</strong> ${currentGeneratedTimetable.params?.department || "Unknown"}</p>
      <p><strong>Semester:</strong> ${currentGeneratedTimetable.params?.semester || "Unknown"}</p>
      <p><strong>Note:</strong> This will clear the display and remove the current timetable.</p>
    `,
    confirmText: "Yes, Delete Timetable",
    cancelText: "Cancel",
  });

  if (!confirmed) {
    return;
  }

  try {
    // Clear the timetable display and restore placeholder
    const dynamicTimetable = document.getElementById("dynamic-timetable");
    const timetableTitle = document.getElementById("timetable-title");

    if (dynamicTimetable) {
      dynamicTimetable.innerHTML = `
        <div class="timetable-placeholder">
          <div class="placeholder-content">
            <h3>No Timetable Generated Yet</h3>
            <p>Use the Timetable Generator above to create your schedule</p>
            <div class="btn-container">
              <button onclick="scrollToGenerator()" class="btn">Generate Timetable</button>
            </div>
          </div>
        </div>
      `;
    }

    if (timetableTitle) {
      timetableTitle.textContent = "Generated Timetable";
    }

    // Clear the current timetable data
    currentGeneratedTimetable = null;

    // Re-evaluate saved timetables display after deleting generated timetable
    await renderSavedTimetables();

    showToast("Timetable deleted successfully!", "success");

    // Hide the subject summary and keep saved section as is; no generated section present now
  } catch (error) {
    console.error("Error deleting timetable:", error);
    showToast("Failed to delete timetable. Please try again.", "error");
  }
}

/**
 * Render saved timetables from server, sorted by Course > Department > Semester (ascending)
 */
async function renderSavedTimetables() {
  try {
    const response = await authenticatedFetch(`${API_BASE}/api/timetables`);
    if (!response.ok) throw new Error("Failed to load saved timetables");
    const saved = await response.json();

    const section = document.getElementById("saved-timetables-section");
    const list = document.getElementById("savedTimetablesList");
    const placeholder = document.querySelector(".timetable-placeholder");
    const timetableTitle = document.getElementById("timetable-title");
    const savedTimetablesH3 = document.querySelector("#saved-timetables-section h3");

    if (!section || !list) return;

    if (!saved || saved.length === 0) {
      // No saved timetables - show placeholder, hide saved section
      section.style.display = "none";
      if (placeholder) {
        placeholder.classList.remove("hidden");
        // Ensure CSS controls display (grid) instead of inline styles
        placeholder.style.removeProperty("display");
      }
      if (timetableTitle) timetableTitle.textContent = "Generated Timetable";
      if (savedTimetablesH3) savedTimetablesH3.style.display = "block";
      list.innerHTML = "";
      return;
    }

    // Has saved timetables - hide placeholder, show saved section, hide redundant h3
    if (placeholder) {
      placeholder.classList.add("hidden");
      // Clear any inline display so CSS can govern when shown again
      placeholder.style.removeProperty("display");
    }

    // Set title based on user role
    if (timetableTitle) {
      const currentUser = window.getCurrentUser ? window.getCurrentUser() : null;
      if (currentUser && currentUser.role === "admin") {
        timetableTitle.textContent = "Your Saved Timetables";
      } else {
        timetableTitle.textContent = "Timetables";
      }
    }

    if (savedTimetablesH3) savedTimetablesH3.style.display = "none";
    section.style.display = "block";

    // Sort timetables by Semester (1-8) first, then by Course alphabetically
    const getSemesterNumber = (semester) => {
      const match = (semester || "").match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    saved.sort((a, b) => {
      // First sort by semester number
      const semesterComparison = getSemesterNumber(a.semester) - getSemesterNumber(b.semester);
      if (semesterComparison !== 0) return semesterComparison;

      // Then sort by course alphabetically
      const courseComparison = (a.course || "").localeCompare(b.course || "");
      if (courseComparison !== 0) return courseComparison;

      // Finally sort by department alphabetically
      return (a.department || "").localeCompare(b.department || "");
    });

    // Newest saved first within same group (optional)
    // saved.sort((a,b)=> new Date(b.savedAt)-new Date(a.savedAt));

    list.innerHTML = saved
      .map(
        (t) => `
        <div class="saved-timetable-header" id="saved-tt-${t.id}">
          <div class="saved-timetable-title">
            ${t.course} • ${t.department} • ${t.semester}
            <div class="saved-timetable-details">
              Students: ${t.students} | Timing: ${convertTo12HourFormat(t.startTime)} - ${convertTo12HourFormat(
          t.endTime
        )} | Slot: ${Math.floor((t.slotDuration || 60) / 60)}h ${(t.slotDuration || 60) % 60}m | Generated: ${new Date(
          t.generatedAt || Date.now()
        ).toLocaleDateString()}
            </div>
          </div>
          <div class="saved-timetable-meta">
            <span>${new Date(t.savedAt || t.generatedAt || Date.now()).toLocaleString()}</span>
            <button class="small-btn primary" onclick="downloadTimetable('${t.id}')">Download</button>
            <button class="small-btn danger admin-only" onclick="deleteSavedTimetable('${t.id}')">Delete</button>
          </div>
        </div>
        <div class="saved-timetable-body">
          ${renderFullTimetableTable(t.timetable, t)}
        </div>`
      )
      .join("");

    // Update UI based on user role to hide/show admin-only elements
    const currentUser = window.getCurrentUser ? window.getCurrentUser() : null;
    if (currentUser && window.updateUIForUserRole) {
      window.updateUIForUserRole(currentUser.role);
    }
  } catch (e) {
    console.error(e);
  }
}

function renderMiniTableGrid(timetable) {
  if (!timetable) return "";
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  // Choose a compact rendering: just list first non-empty sessions per day
  const rows = days
    .map((day) => {
      const sessions = Object.values(timetable[day] || {}).filter(Boolean);
      const first = sessions[0];
      if (!first) return `<div class="mini-row"><b>${day}:</b> -</div>`;
      return `<div class=\"mini-row\"><b>${day}:</b> ${first.subject} (${first.type}) - ${convertTo12HourFormat(
        first.startTime
      )}-${convertTo12HourFormat(first.endTime)}</div>`;
    })
    .join("");
  return `<div class="mini-grid">${rows}</div>`;
}

/**
 * Render a full timetable table for saved timetables
 */
function renderFullTimetableTable(timetableData, params) {
  if (!timetableData || !params) return "";

  const workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // For saved timetables without break info, try to detect breaks from the data
  let inferredBreakStart = null;
  let inferredBreakEnd = null;
  let inferredSlotDuration = params.slotDuration || 60;
  let inferredHasBreak = params.hasBreak || false;

  // If break parameters are missing, try to infer from timetable data
  if (!params.hasBreak && timetableData.Monday) {
    const mondaySlots = Object.values(timetableData.Monday);
    if (mondaySlots.length >= 2) {
      // Look for time gaps between slots to detect breaks
      const sortedSlots = mondaySlots.sort((a, b) => {
        const timeA = new Date(`1970-01-01T${a.startTime}:00`);
        const timeB = new Date(`1970-01-01T${b.startTime}:00`);
        return timeA - timeB;
      });

      for (let i = 0; i < sortedSlots.length - 1; i++) {
        const currentEnd = new Date(`1970-01-01T${sortedSlots[i].endTime}:00`);
        const nextStart = new Date(`1970-01-01T${sortedSlots[i + 1].startTime}:00`);
        const gap = (nextStart - currentEnd) / (1000 * 60); // Gap in minutes

        // If there's a gap of 30+ minutes, assume it's a break
        if (gap >= 30) {
          inferredBreakStart = sortedSlots[i].endTime;
          inferredBreakEnd = sortedSlots[i + 1].startTime;
          inferredHasBreak = true;
          break;
        }
      }
    }
  }

  // Generate time slots based on saved params (with inferred values for missing ones)
  const timeSlots = generateTimeSlots(
    params.startTime,
    params.endTime,
    inferredSlotDuration,
    inferredHasBreak ? params.breakStartTime || inferredBreakStart : null,
    inferredHasBreak ? params.breakEndTime || inferredBreakEnd : null,
    params.lecturesPerDay || 6 // Default to 6 lectures per day
  );

  // Use the generateTimetableRows function for consistency
  const enhancedParams = {
    ...params,
    slotDuration: inferredSlotDuration,
    hasBreak: inferredHasBreak,
    breakStartTime: params.breakStartTime || inferredBreakStart,
    breakEndTime: params.breakEndTime || inferredBreakEnd,
  };
  const tableRows = generateTimetableRows(timeSlots, timetableData, workingDays, enhancedParams);
  return `
    <div class="timetable-container">
      <table class="timetable-grid">
        <thead>
          <tr>
            <th class="time-header">Time</th>
            ${workingDays.map((day) => `<th class="day-header">${day}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${tableRows.join("")}
        </tbody>
      </table>
    </div>
  `;
}
async function deleteSavedTimetable(id) {
  // Find the saved timetable to get its details for the modal
  let savedTimetable = null;
  if (database && database.savedTimetables) {
    savedTimetable = database.savedTimetables.find((t) => t.id === id);
  }

  if (!savedTimetable) {
    showToast("Saved timetable not found", "error");
    return;
  }

  // Show confirmation modal
  const confirmed = await showDeleteConfirmationModal({
    title: "🗑️ Delete Saved Timetable",
    message: "Are you sure you want to delete this saved timetable?",
    itemDetails: `
      <p><strong>Course:</strong> ${savedTimetable.course}</p>
      <p><strong>Department:</strong> ${savedTimetable.department}</p>
      <p><strong>Semester:</strong> ${savedTimetable.semester}</p>
      <p><strong>Students:</strong> ${savedTimetable.students}</p>
      <p><strong>Timing:</strong> ${convertTo12HourFormat(savedTimetable.startTime)} - ${convertTo12HourFormat(
      savedTimetable.endTime
    )}</p>
      <p><strong>Generated:</strong> ${new Date(savedTimetable.generatedAt || Date.now()).toLocaleDateString()}</p>
    `,
    confirmText: "Yes, Delete Saved Timetable",
    cancelText: "Cancel",
  });

  if (!confirmed) {
    return;
  }

  try {
    const res = await authenticatedFetch(`${API_BASE}/api/timetables/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete saved timetable");

    // Update local database by removing the deleted timetable
    if (database && database.savedTimetables) {
      database.savedTimetables = database.savedTimetables.filter((tt) => tt.id !== id);
    }

    await renderSavedTimetables();
    showToast("Saved timetable deleted", "success");

    // Update statistics count
    if (typeof updateStatistics === "function") {
      updateStatistics();
    }
  } catch (e) {
    console.error(e);
    showToast("Failed to delete saved timetable", "error");
  }
}

/**
 * Focus Timetable tab and smooth scroll to generated or saved section
 */
function focusTimetableTabAndScroll() {
  // Switch to Timetable tab
  const ttTab = document.getElementById("timetable-tab");
  const allTabs = document.querySelectorAll(".tab");
  const allContents = document.querySelectorAll(".tab-content");
  if (ttTab) {
    allTabs.forEach((t) => t.classList.remove("active"));
    allContents.forEach((c) => c.classList.add("hidden"));
    ttTab.classList.add("active");
    const ttContent = document.getElementById("timetable-content");
    if (ttContent) ttContent.classList.remove("hidden");
  }

  // Scroll to the generated timetable area if present, else saved list
  const generated = document.getElementById("dynamic-timetable");
  if (generated && generated.offsetParent !== null) {
    generated.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const savedSection = document.getElementById("saved-timetables-section");
  if (savedSection && savedSection.style.display !== "none") {
    savedSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function scrollToSavedTimetable(id) {
  const el = document.getElementById(`saved-tt-${id}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * Update timetable action buttons based on saved state
 */
function updateTimetableActionButtons(isSaved, timetableId = null) {
  const saveBtn = document.querySelector(".timetable-action-btn.save-btn");
  const deleteBtn = document.querySelector(".timetable-action-btn.delete-btn");

  if (saveBtn && isSaved) {
    saveBtn.innerHTML = `
        <img src="res/save.svg" alt="Saved">
        Saved ✓
      `;
    saveBtn.disabled = true;
    saveBtn.style.opacity = "0.6";
  }
}

/**
 * Save generated timetable to database
 */
async function saveTimetableToDatabase(timetableData) {
  try {
    // Add to generatedTimetables array
    if (!database.generatedTimetables) {
      database.generatedTimetables = [];
    }

    database.generatedTimetables.push(timetableData);

    // Note: In a real implementation, you'd call an API to save this
    // For now, we'll just update the local database object
    console.log("✅ Timetable saved to database");
    if (typeof updateStatistics === "function") {
      updateStatistics();
    }
  } catch (error) {
    console.error("❌ Error saving timetable to database:", error);
  }
}

/**
 * ========================================
 * VALIDATION FUNCTIONS
 * ========================================
 */

/**
 * Validate subject data
 */
function validateSubjectData(data) {
  if (!data.name || !data.code || !data.course || !data.department || !data.semester || !data.assignedFaculty) {
    showToast("Please fill in all required fields", "error");
    return false;
  }

  if (data.lectureHours < 0 || data.labHours < 0) {
    showToast("Hours cannot be negative", "error");
    return false;
  }

  // Validate lab duration consistency
  if (data.labHours === 0 && data.labDuration > 0) {
    showToast("Lab duration should be 0 when there are no lab hours", "error");
    return false;
  }

  if (data.labHours > 0 && data.labDuration === 0) {
    showToast("Lab duration must be specified when there are lab hours", "error");
    return false;
  }

  // Note: Duplicate checking removed - will be handled by auto-update logic

  return true;
}

/**
 * Validate faculty data
 */
function validateFacultyData(data) {
  if (!data.name || !data.specialization || !data.department || !data.email) {
    showToast("Please fill in all required fields", "error");
    return false;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    showToast("Please enter a valid email address", "error");
    return false;
  }

  // Note: Duplicate checking removed - will be handled by auto-update logic

  return true;
}

/**
 * Validate room data
 */
function validateRoomData(data) {
  if (!data.number || !data.type || !data.building || !data.floor) {
    showToast("Please fill in all required fields", "error");
    return false;
  }

  if (data.capacity <= 0) {
    showToast("Room capacity must be greater than 0", "error");
    return false;
  }

  // Note: Duplicate checking removed - will be handled by auto-update logic

  return true;
}

/**
 * Auto-calculate optimal lectures per day based on weekly hour requirements
 */
function calculateOptimalLecturesPerDay(params) {
  try {
    // Get subjects for the selected course, department, and semester
    const filteredSubjects = subjects.filter(
      (s) => s.course === params.course && s.department === params.department && s.semester === params.semester
    );

    if (filteredSubjects.length === 0) {
      console.warn("No subjects found for auto-calculation");
      return 6; // Default fallback
    }

    // Calculate total weekly hours needed
    let totalWeeklyLectureHours = 0;
    let totalWeeklyLabHours = 0;

    filteredSubjects.forEach((subject) => {
      totalWeeklyLectureHours += subject.lectureHours || 0;
      totalWeeklyLabHours += subject.labHours || 0;
    });

    console.log("📊 Weekly Requirements:", {
      subjects: filteredSubjects.length,
      totalLectureHours: totalWeeklyLectureHours,
      totalLabHours: totalWeeklyLabHours,
    });

    // Calculate available time per day
    const start = new Date(`1970-01-01T${params.startTime}:00`);
    const end = new Date(`1970-01-01T${params.endTime}:00`);
    const dailyMinutes = (end - start) / (1000 * 60);

    // Subtract break time if enabled
    let breakMinutes = 0;
    if (params.hasBreak && params.breakStartTime && params.breakEndTime) {
      const breakStart = new Date(`1970-01-01T${params.breakStartTime}:00`);
      const breakEnd = new Date(`1970-01-01T${params.breakEndTime}:00`);
      breakMinutes = (breakEnd - breakStart) / (1000 * 60);
    }

    const availableDailyMinutes = dailyMinutes - breakMinutes;
    const slotDurationMinutes = params.slotDuration || 60;
    const maxSlotsPerDay = Math.floor(availableDailyMinutes / slotDurationMinutes);

    // Convert hours to slots (assuming 1 hour = 1 slot for lectures)
    // For labs, we need to consider lab duration (usually 2+ hours per lab session)
    const lectureSlotDuration = slotDurationMinutes / 60; // in hours
    const totalWeeklyLectureSlots = Math.ceil(totalWeeklyLectureHours / lectureSlotDuration);

    // Labs need special handling - each lab session is typically 2+ hours
    const avgLabSessionDuration = 2; // hours per lab session
    const labSessionsPerWeek = Math.ceil(totalWeeklyLabHours / avgLabSessionDuration);
    const labSlotsNeeded = labSessionsPerWeek * Math.ceil(avgLabSessionDuration / lectureSlotDuration);

    const totalWeeklySlots = totalWeeklyLectureSlots + labSlotsNeeded;
    const workingDays = 5; // Monday to Friday
    const optimalSlotsPerDay = Math.ceil(totalWeeklySlots / workingDays);

    console.log("🧮 Auto-calculation Details:", {
      dailyMinutes,
      breakMinutes,
      availableDailyMinutes,
      maxSlotsPerDay,
      totalWeeklyLectureSlots,
      labSlotsNeeded,
      totalWeeklySlots,
      optimalSlotsPerDay,
    });

    // Ensure we don't exceed available time
    const finalSlotsPerDay = Math.min(optimalSlotsPerDay, maxSlotsPerDay);

    if (finalSlotsPerDay < optimalSlotsPerDay) {
      console.warn(
        `⚠️ Time constraint: Need ${optimalSlotsPerDay} slots but only ${finalSlotsPerDay} fit in available time`
      );
    }

    return Math.max(1, finalSlotsPerDay); // At least 1 slot
  } catch (error) {
    console.error("❌ Error in auto-calculation:", error);
    return 6; // Default fallback
  }
}

/**
 * Validate timetable generation parameters
 */
function validateTimetableParams(params) {
  if (!params.course || !params.department || !params.semester) {
    showToast("Please select course, department, and semester", "error");
    return false;
  }

  if (params.students <= 0) {
    showToast("Number of students must be greater than 0", "error");
    return false;
  }

  if (!params.startTime || !params.endTime) {
    showToast("Please specify college start and end time", "error");
    return false;
  }

  // Validate time range
  const start = new Date(`1970-01-01T${params.startTime}:00`);
  const end = new Date(`1970-01-01T${params.endTime}:00`);

  if (start >= end) {
    showToast("End time must be after start time", "error");
    return false;
  }

  const duration = (end - start) / (1000 * 60 * 60); // Duration in hours
  if (duration < 2) {
    showToast("College timing should be at least 2 hours", "error");
    return false;
  }

  return true;
}

/**
 * Validate course and department data
 */
function validateCourseDepartmentData(data) {
  if (!data.course || typeof data.course !== "string" || data.course.trim() === "") {
    showToast("Please enter a course name", "error");
    return false;
  }

  if (!data.department || typeof data.department !== "string" || data.department.trim() === "") {
    showToast("Please enter a department name", "error");
    return false;
  }

  // Check for duplicate combination
  const existingCombination = courseDepartments.find(
    (cd) =>
      cd.course.toLowerCase() === data.course.toLowerCase() &&
      cd.department.toLowerCase() === data.department.toLowerCase()
  );
  if (existingCombination) {
    showToast("This course-department combination already exists", "error");
    return false;
  }

  return true;
}

/**
 * ========================================
 * CRUD OPERATIONS
 * ========================================
 */

/**
 * Delete subject
 */
async function deleteSubject(subjectId) {
  // Find the subject to get its details for the modal
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) {
    showToast("Subject not found", "error");
    return;
  }

  // Show confirmation modal
  const confirmed = await showDeleteConfirmationModal({
    title: "🗑️ Delete Subject",
    message: "Are you sure you want to delete this subject?",
    itemDetails: `
      <p><strong>Subject Code:</strong> ${subject.code}</p>
      <p><strong>Subject Name:</strong> ${subject.name}</p>
      <p><strong>Credits:</strong> ${subject.credits}</p>
      <p><strong>Type:</strong> ${subject.type}</p>
    `,
    confirmText: "Yes, Delete Subject",
    cancelText: "Cancel",
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await authenticatedFetch(`${API_BASE}/api/subjects/${subjectId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      subjects = subjects.filter((s) => s.id !== subjectId);
      renderSubjects();
      showToast("Subject deleted successfully!", "success");
      if (typeof updateStatistics === "function") {
        updateStatistics();
      }
    } else {
      throw new Error("Failed to delete subject");
    }
  } catch (error) {
    console.error("Error deleting subject:", error);
    showToast("Failed to delete subject. Please try again.", "error");
  }
}

/**
 * Delete faculty
 */
async function deleteFaculty(facultyId) {
  // Find the faculty to get its details for the modal
  const facultyMember = faculty.find((f) => f.id === facultyId);
  if (!facultyMember) {
    showToast("Faculty not found", "error");
    return;
  }

  // Show confirmation modal
  const confirmed = await showDeleteConfirmationModal({
    title: "🗑️ Delete Faculty",
    message: "Are you sure you want to delete this faculty member?",
    itemDetails: `
      <p><strong>Faculty Name:</strong> ${facultyMember.name}</p>
      <p><strong>Department:</strong> ${facultyMember.department}</p>
      <p><strong>Specialization:</strong> ${facultyMember.specialization || "Not specified"}</p>
    `,
    confirmText: "Yes, Delete Faculty",
    cancelText: "Cancel",
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await authenticatedFetch(`${API_BASE}/api/faculty/${facultyId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      faculty = faculty.filter((f) => f.id !== facultyId);
      renderFaculty();
      populateSubjectFormDropdowns(); // Refresh faculty dropdown
      showToast("Faculty deleted successfully!", "success");
      if (typeof updateStatistics === "function") {
        updateStatistics();
      }
    } else {
      throw new Error("Failed to delete faculty");
    }
  } catch (error) {
    console.error("Error deleting faculty:", error);
    showToast("Failed to delete faculty. Please try again.", "error");
  }
}

/**
 * Delete room
 */
async function deleteRoom(roomId) {
  // Find the room to get its details for the modal
  const room = rooms.find((r) => r.id === roomId);
  if (!room) {
    showToast("Room not found", "error");
    return;
  }

  // Show confirmation modal
  const confirmed = await showDeleteConfirmationModal({
    title: "🗑️ Delete Room",
    message: "Are you sure you want to delete this room?",
    itemDetails: `
      <p><strong>Room Number:</strong> ${room.number}</p>
      <p><strong>Room Type:</strong> ${room.type}</p>
      <p><strong>Capacity:</strong> ${room.capacity} students</p>
      <p><strong>Location:</strong> ${room.location || "Not specified"}</p>
    `,
    confirmText: "Yes, Delete Room",
    cancelText: "Cancel",
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await authenticatedFetch(`${API_BASE}/api/rooms/${roomId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      rooms = rooms.filter((r) => r.id !== roomId);
      renderRooms();
      showToast("Room deleted successfully!", "success");
      if (typeof updateStatistics === "function") {
        updateStatistics();
      }
    } else {
      throw new Error("Failed to delete room");
    }
  } catch (error) {
    console.error("Error deleting room:", error);
    showToast("Failed to delete room. Please try again.", "error");
  }
}

/**
 * ========================================
 * EDIT FUNCTIONS
 * ========================================
 */

/**
 * Edit subject
 */
function editSubject(subjectId) {
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) {
    showToast("Subject not found!", "error");
    return;
  }

  // Populate the form with existing data
  const form = document.getElementById("subjectForm");
  if (form) {
    form.querySelector('[name="subjectName"]').value = subject.name || "";
    form.querySelector('[name="subjectCode"]').value = subject.code || "";
    form.querySelector('[name="subjectCourse"]').value = subject.course || "";
    form.querySelector('[name="subjectDepartment"]').value = subject.department || "";
    form.querySelector('[name="lectureHours"]').value = subject.lectureHours || 0;
    form.querySelector('[name="labHours"]').value = subject.labHours || 0;
    form.querySelector('[name="labDuration"]').value = subject.labDuration || 0;
    form.querySelector('[name="totalHours"]').value = subject.totalHours || 0;
    form.querySelector('[name="assignedFaculty"]').value = subject.assignedFaculty || "";
    form.querySelector('[name="subjectSemester"]').value = subject.semester || "";

    // Change form to edit mode
    form.dataset.editId = subjectId;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = "Update Subject";
    }

    // Scroll to form
    form.scrollIntoView({ behavior: "smooth" });
    showToast("Edit mode activated. Update the fields and submit.", "info");
  }
}

/**
 * Edit faculty
 */
function editFaculty(facultyId) {
  const facultyMember = faculty.find((f) => f.id === facultyId);
  if (!facultyMember) {
    showToast("Faculty not found!", "error");
    return;
  }

  // Populate the form with existing data
  const form = document.getElementById("facultyForm");
  if (form) {
    form.querySelector('[name="facultyName"]').value = facultyMember.name || "";
    form.querySelector('[name="facultySpecialization"]').value = facultyMember.specialization || "";
    form.querySelector('[name="facultyDepartment"]').value = facultyMember.department || "";
    form.querySelector('[name="facultyEmail"]').value = facultyMember.email || "";

    // Change form to edit mode
    form.dataset.editId = facultyId;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = "Update Faculty";
    }

    // Scroll to form
    form.scrollIntoView({ behavior: "smooth" });
    showToast("Edit mode activated. Update the fields and submit.", "info");
  }
}
/**
 * Edit room
 */
function editRoom(roomId) {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) {
    showToast("Room not found!", "error");
    return;
  }

  // Populate the form with existing data
  const form = document.getElementById("roomForm");
  if (form) {
    form.querySelector('[name="roomNumber"]').value = room.number || "";
    form.querySelector('[name="roomType"]').value = room.type || "";
    form.querySelector('[name="roomBuilding"]').value = room.building || "";
    form.querySelector('[name="roomFloor"]').value = room.floor || "";
    form.querySelector('[name="roomCapacity"]').value = room.capacity || "";
    form.querySelector('[name="roomEquipment"]').value = room.equipment || "";

    // Change form to edit mode
    form.dataset.editId = roomId;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = "Update Room";
    }

    // Scroll to form
    form.scrollIntoView({ behavior: "smooth" });
    showToast("Edit mode activated. Update the fields and submit.", "info");
  }
}

/**
 * Edit course-department combination
 */
function editCourseDepartment(index) {
  const cd = courseDepartments[index];
  if (!cd) {
    showToast("Course-department combination not found!", "error");
    return;
  }

  // Populate form fields with course-department data
  const courseForm = document.getElementById("courseForm");
  const courseNameInput = document.getElementById("courseName");
  const departmentNameInput = document.getElementById("departmentName");

  if (courseForm && courseNameInput && departmentNameInput) {
    courseNameInput.value = cd.course;
    departmentNameInput.value = cd.department;

    // Set form to edit mode
    courseForm.dataset.editIndex = index;
    const submitBtn = courseForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = "Update Course & Department";
    }

    // Switch to courses & departments tab
    document.getElementById("departments-tab").click();

    showToast("Edit mode activated. Update the fields and submit.", "info");
  }
}

/**
 * Delete course-department combination
 */
async function deleteCourseDepartment(index) {
  const cd = courseDepartments[index];
  if (!cd) {
    showToast("Course-department combination not found!", "error");
    return;
  }

  // Show confirmation modal
  const confirmed = await showDeleteConfirmationModal({
    title: "🗑️ Delete Course-Department",
    message: "Are you sure you want to delete this course-department combination?",
    itemDetails: `
      <p><strong>Course:</strong> ${cd.course}</p>
      <p><strong>Department:</strong> ${cd.department}</p>
    `,
    confirmText: "Yes, Delete Combination",
    cancelText: "Cancel",
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await authenticatedFetch(`${API_BASE}/api/course-departments/${cd.id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      courseDepartments.splice(index, 1);

      // Rebuild courses and departments arrays from remaining combinations
      courses = [...new Set(courseDepartments.map((cd) => cd.course))];
      departments = [...new Set(courseDepartments.map((cd) => cd.department))];

      showToast("Course-department combination deleted successfully!", "success");
      renderCourseDepartments();
      populateAllDropdowns(); // Update all dropdowns after deletion

      if (typeof updateStatistics === "function") {
        updateStatistics();
      }
    } else {
      throw new Error("Failed to delete course-department combination");
    }
  } catch (error) {
    console.error("Error deleting course-department combination:", error);
    showToast("Failed to delete course-department combination. Please try again.", "error");
  }
}

/**
 * ========================================
 * UTILITY FUNCTIONS
 * ========================================
 */

/**
 * Convert 24-hour time format to 12-hour format
 */
function convertTo12HourFormat(time24) {
  if (!time24) return time24;

  const [hours, minutes] = time24.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Convert minutes to hour format (e.g., 90 -> "1h 30m")
 */
function convertMinutesToHourFormat(minutes) {
  if (!minutes || minutes === 0) return "0m";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  } else if (remainingMinutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${remainingMinutes}m`;
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; margin-left: 10px; cursor: pointer;">&times;</button>
  `;

  toastContainer.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }
  }, 5000);
}

/**
 * Show/hide loading state
 */
function showLoadingState(show) {
  const body = document.body;
  if (show) {
    body.style.cursor = "wait";
    // You could add a loading overlay here if desired
  } else {
    body.style.cursor = "default";
  }
}
/**
 * Scroll to generator section
 */
function scrollToGenerator() {
  const generatorPanel = document.querySelector(".generator-panel");
  if (generatorPanel) {
    generatorPanel.scrollIntoView({ behavior: "smooth" });
  }
}

/**
 * Helper functions for getting data (used by script.js)
 */
function getSubjects() {
  return subjects;
}

function getFaculty() {
  return faculty;
}

function getRooms() {
  return rooms;
}

/**
 * Initialize the system when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", () => {
  // Disable browser scroll restoration and ensure page starts at top
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  // Force scroll to top on page load
  window.scrollTo(0, 0);

  initializeTimetableSystem();
});

// Also ensure scroll position is reset on window load (backup)
window.addEventListener("load", () => {
  window.scrollTo(0, 0);
});

// Export functions for global access
window.deleteSubject = deleteSubject;
window.deleteFaculty = deleteFaculty;
window.deleteRoom = deleteRoom;
window.editSubject = editSubject;
window.editFaculty = editFaculty;
window.editRoom = editRoom;
window.scrollToGenerator = scrollToGenerator;
window.getSubjects = getSubjects;
window.getFaculty = getFaculty;
window.getRooms = getRooms;
window.saveTimetable = saveTimetable;
/**
 * Download the current generated timetable as PDF
 */
function downloadCurrentTimetable() {
  if (!currentGeneratedTimetable) {
    showToast("No timetable to download. Please generate a timetable first.", "error");
    return;
  }

  const { timetableData, params } = currentGeneratedTimetable;
  downloadTimetableAsPDF(timetableData, params);
}

/**
 * Download a saved timetable by ID as PDF
 */
async function downloadTimetable(timetableId) {
  try {
    const response = await authenticatedFetch(`${API_BASE}/api/timetables`);
    const data = await response.json();

    const timetable = data.find((t) => t.id === timetableId);
    if (!timetable) {
      showToast("Timetable not found", "error");
      return;
    }

    downloadTimetableAsPDF(timetable.timetable, timetable);
  } catch (error) {
    console.error("Error downloading timetable:", error);
    showToast("Failed to download timetable. Please try again.", "error");
  }
}

/**
 * Generate and download PDF for a timetable using jsPDF with AutoTable
 */
function downloadTimetableAsPDF(timetableData, params) {
  try {
    showToast("Generating PDF...", "info");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Set document properties
    doc.setProperties({
      title: `${params.course} - ${params.department} - ${params.semester} Timetable`,
      subject: "Timetable",
      author: "Interactive Timetable Generator",
      creator: "Interactive Timetable Generator",
    });

    // Generate and add only the timetable table
    addSimpleTimetableToPDF(doc, timetableData, params);

    // Generate filename and save
    const filename = `${params.course}_${params.department}_${params.semester}_Timetable.pdf`.replace(/\s+/g, "_");
    doc.save(filename);

    showToast("Timetable downloaded successfully!", "success");
  } catch (error) {
    console.error("Error generating PDF:", error);
    showToast("Failed to generate PDF. Please try again.", "error");
  }
}

/**
 * Add simple black and white timetable table to PDF
 */
function addSimpleTimetableToPDF(doc, timetableData, params) {
  const timeSlots = generateTimeSlots(
    params.startTime,
    params.endTime,
    params.slotDuration,
    params.hasBreak ? params.breakStartTime : null,
    params.hasBreak ? params.breakDuration : null
  );

  const workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Prepare table headers
  const headers = [["Time", ...workingDays]];

  // Prepare table data
  const tableData = [];

  timeSlots.forEach((slot, index) => {
    const slotNumber = (index + 1).toString();
    const row = [`${convertTo12HourFormat(slot.startTime)} - ${convertTo12HourFormat(slot.endTime)}`];

    workingDays.forEach((day) => {
      const session = timetableData[day] && timetableData[day][slotNumber];
      if (session) {
        // Skip continuation slots of multi-hour sessions
        if (session.slotPosition && session.slotPosition !== "first") {
          return; // Skip this iteration, don't add to row
        }

        const sessionText = `${session.subject}\n${session.faculty}\n${session.room}`;
        row.push(sessionText);
      } else {
        row.push("");
      }
    });

    // Only add row if it has the correct number of columns
    if (row.length === 6) {
      // 1 time column + 5 day columns
      tableData.push(row);
    }
  });

  // Generate the simple black and white table
  doc.autoTable({
    head: headers,
    body: tableData,
    startY: 20,
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 4,
      overflow: "linebreak",
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0], // Black lines
      lineWidth: 0.5,
      textColor: [0, 0, 0], // Black text
      fillColor: [255, 255, 255], // White background
    },
    headStyles: {
      fillColor: [255, 255, 255], // White header background
      textColor: [0, 0, 0], // Black header text
      fontSize: 12,
      fontStyle: "bold",
      halign: "center",
      lineColor: [0, 0, 0], // Black border
      lineWidth: 1,
    },
    columnStyles: {
      0: {
        cellWidth: 40,
        halign: "center",
        fillColor: [255, 255, 255], // White background
        textColor: [0, 0, 0], // Black text
        fontStyle: "bold",
      },
    },
    margin: { left: 15, right: 15, top: 15, bottom: 15 },
    tableWidth: "auto",
    showHead: "everyPage",
  });
}

/**
 * Generate printable HTML for timetable
 */
function generatePrintableHTML(timetableData, params, title) {
  const timeSlots = generateTimeSlots(
    params.startTime || "09:00",
    params.endTime || "17:00",
    params.slotDuration || 60
  );

  const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const days = daysOrder.filter((day) => timetableData[day]);

  let tableHTML = `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold;">Time</th>
          ${days
            .map(
              (day) =>
                `<th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold;">${day}</th>`
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
  `;

  timeSlots.forEach((slot, index) => {
    const slotNumber = (index + 1).toString();
    tableHTML += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; background-color: #f9f9f9;">
          Slot ${slotNumber}<br>
          <small style="color: #666;">${slot.startTime} - ${slot.endTime}</small>
        </td>
    `;

    days.forEach((day) => {
      const daySchedule = timetableData[day];
      const slotData = daySchedule ? daySchedule[slotNumber] : null;

      if (slotData) {
        const bgColor = slotData.type === "Lab" ? "#e3f2fd" : "#f3e5f5";
        tableHTML += `
          <td style="border: 1px solid #ddd; padding: 8px; background-color: ${bgColor};">
            <div style="font-weight: bold; margin-bottom: 4px;">${slotData.subject}</div>
            <div style="font-size: 0.9em; color: #666;">
              ${slotData.faculty}<br>
              Room: ${slotData.room}<br>
              ${slotData.type}${slotData.duration > 1 ? ` (${slotData.duration}h)` : ""}
            </div>
          </td>
        `;
      } else {
        tableHTML += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #999;">Free</td>`;
      }
    });

    tableHTML += "</tr>";
  });

  tableHTML += "</tbody></table>";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        h1 {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        .header-info {
          text-align: center;
          margin-bottom: 30px;
          color: #666;
        }
        .header-info div {
          margin: 5px 0;
        }
        table {
          page-break-inside: avoid;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="header-info">
        <div><strong>Students:</strong> ${params.students || "N/A"}</div>
        <div><strong>Timing:</strong> ${convertTo12HourFormat(params.startTime || "09:00")} - ${convertTo12HourFormat(
    params.endTime || "17:00"
  )}</div>
        <div><strong>Slot Duration:</strong> ${Math.floor((params.slotDuration || 60) / 60)}h ${
    (params.slotDuration || 60) % 60
  }m</div>
        <div><strong>Generated on:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
      </div>
      ${tableHTML}
      <div style="margin-top: 30px; text-align: center; color: #666; font-size: 0.9em;">
        Generated by Interactive Timetable Generator
      </div>
    </body>
    </html>
  `;
}

window.deleteTimetable = deleteTimetable;
window.downloadCurrentTimetable = downloadCurrentTimetable;
window.downloadTimetable = downloadTimetable;
window.deleteSavedTimetable = deleteSavedTimetable;
window.focusTimetableTabAndScroll = focusTimetableTabAndScroll;

// Export database for statistics access
window.getDatabase = () => database;
