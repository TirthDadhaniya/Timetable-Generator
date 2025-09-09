/**
 * Timetable Generator Logic
 * Handles all timetable generation, data management, and UI interactions
 */

// Global variables to store database data
let database = null;
let subjects = [];
let faculty = [];
let rooms = [];
let courses = [];
let departments = [];
let semesters = [];
let roomTypes = [];

// Current generated timetable (temporary until saved)
let currentGeneratedTimetable = null;
let lastSavedTimetableId = null; // for scrolling after save

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
    const response = await fetch(`${API_BASE}/api/database`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    database = await response.json();
    subjects = database.subjects || [];
    faculty = database.faculty || [];
    rooms = database.rooms || [];
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
    renderDepartments();
    await renderSavedTimetables();
    setupFormHandlers();

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

  // Populate courses
  populateSelect(courseSelect, courses);

  // Populate departments
  populateSelect(departmentSelect, departments);

  // Populate semesters
  populateSelect(semesterSelect, semesters);

  // Populate faculty
  const facultyOptions = faculty.map((f) => ({ value: f.name, text: `${f.name} (${f.specialization})` }));
  populateSelect(facultySelect, facultyOptions);
}

/**
 * Populate faculty form dropdowns
 */
function populateFacultyFormDropdowns() {
  const departmentSelect = document.getElementById("facultyDepartment");
  populateSelect(departmentSelect, departments);
}

/**
 * Populate room form dropdowns
 */
function populateRoomFormDropdowns() {
  const roomTypeSelect = document.getElementById("roomType");
  populateSelect(roomTypeSelect, roomTypes);
}

/**
 * Populate timetable generator dropdowns
 */
function populateTimetableGeneratorDropdowns() {
  const genCourseSelect = document.getElementById("genCourse");
  const genDepartmentSelect = document.getElementById("genDepartment");
  const genSemesterSelect = document.getElementById("genSemester");

  populateSelect(genCourseSelect, courses);
  populateSelect(genDepartmentSelect, departments);
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

  subjectList.innerHTML = subjects
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

  facultyList.innerHTML = faculty
    .map(
      (f) => `
    <div class="faculty-card" data-id="${f.id}">
      <div class="faculty-card-content">
          <div class="faculty-card-info">
            <div class="faculty-card-name">${f.name}</div>
            <div class="faculty-card-specialization">Specialization: <b>${f.specialization}</b></div>
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

  roomList.innerHTML = rooms
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
 * Render departments list
 */
function renderDepartments() {
  const departmentList = document.getElementById("departmentList");
  if (!departmentList) return;

  if (departments.length === 0) {
    departmentList.innerHTML = '<p class="empty-state">No departments added yet. Add your first department above.</p>';
    return;
  }

  departmentList.innerHTML = departments
    .map(
      (department, index) => `
    <div class="department-card" data-index="${index}">
      <div class="department-card-content">
          <div class="department-card-info">
            <div class="department-card-name">${department}</div>
          </div>
          <div class="department-card-actions">
            <button onclick="editDepartment(${index})" title="Edit" class="card-action-btn"><img src="res/edit.svg" alt="Edit"></button>
            <button onclick="deleteDepartment(${index})" title="Delete" class="card-action-btn delete-btn"><img src="res/delete.svg" alt="Delete"></button>
          </div>
        </div>
    </div>
  `
    )
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

  // Department form
  const departmentForm = document.getElementById("departmentForm");
  if (departmentForm) {
    departmentForm.addEventListener("submit", handleDepartmentFormSubmission);
  }

  // Timetable generation form
  const timetableGenForm = document.getElementById("timetableGenForm");
  if (timetableGenForm) {
    timetableGenForm.addEventListener("submit", handleTimetableGeneration);
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

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
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

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
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

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
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
 * Handle department form submission
 */
async function handleDepartmentFormSubmission(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const departmentData = {
    name: formData.get("departmentName"),
  };

  // Validation
  if (!validateDepartmentData(departmentData)) {
    return;
  }

  // Check if this is an edit operation
  const editIndex = event.target.dataset.editIndex;
  let isEdit = editIndex !== undefined;

  try {
    let url, method;
    
    if (isEdit) {
      url = `${API_BASE}/api/departments/${editIndex}`;
      method = "PUT";
    } else {
      url = `${API_BASE}/api/departments`;
      method = "POST";
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(departmentData),
    });

    if (response.ok) {
      const result = await response.json();

      if (isEdit) {
        // Update existing department
        departments[parseInt(editIndex)] = result.newName;
        showToast("Department updated successfully!", "success");

        // Reset form to add mode
        delete event.target.dataset.editIndex;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.textContent = "Add Department";
        }
      } else {
        // Add new department
        departments.push(result.name);
        showToast("Department added successfully!", "success");
      }

      renderDepartments();
      populateAllDropdowns(); // Refresh department dropdowns everywhere
      event.target.reset();

      if (typeof updateStatistics === "function") {
        updateStatistics();
      }
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to ${isEdit ? "update" : "add"} department`);
    }
  } catch (error) {
    console.error(`Error ${isEdit ? "updating" : "adding"} department:`, error);
    showToast(error.message || `Failed to ${isEdit ? "update" : "add"} department. Please try again.`, "error");
  }
}

/**
 * ========================================
 * TIMETABLE GENERATION FUNCTIONS
 * ========================================
 */

/**
 * Handle timetable generation form submission
 */
async function handleTimetableGeneration(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const generationParams = {
    course: formData.get("course") || document.getElementById("genCourse").value,
    department: formData.get("department") || document.getElementById("genDepartment").value,
    semester: formData.get("semester") || document.getElementById("genSemester").value,
    students: parseInt(formData.get("students")) || parseInt(document.getElementById("genStudents").value) || 0,
    startTime: formData.get("startTime") || document.getElementById("collegeStartTime").value,
    endTime: formData.get("endTime") || document.getElementById("collegeEndTime").value,
  };

  // Validation
  if (!validateTimetableParams(generationParams)) {
    return;
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
  const { course, department, semester, students, startTime, endTime } = params;

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
      subjects: filteredSubjects.map((s) => ({ name: s.name, faculty: s.assignedFaculty })),
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
    const timeSlots = generateTimeSlots(startTime, endTime);

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
function generateTimeSlots(startTime, endTime) {
  const slots = [];
  const start = new Date(`1970-01-01T${startTime}:00`);
  const end = new Date(`1970-01-01T${endTime}:00`);

  let current = new Date(start);
  let slotNumber = 1;

  while (current < end) {
    const next = new Date(current.getTime() + 60 * 60 * 1000); // Add 1 hour
    if (next <= end) {
      slots.push({
        id: slotNumber,
        startTime: current.toTimeString().slice(0, 5),
        endTime: next.toTimeString().slice(0, 5),
        duration: 1, // 1 hour
      });
      slotNumber++;
    }
    current = next;
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
 * Display the generated timetable in the UI
 */
function displayGeneratedTimetable(timetableData, params) {
  const dynamicTimetable = document.getElementById("dynamic-timetable");
  const timetableTitle = document.getElementById("timetable-title");

  if (!dynamicTimetable) return;

  // Update title
  if (timetableTitle) {
    timetableTitle.textContent = `Timetable: ${params.course} - ${params.department} - ${params.semester}`;
  }

  // Generate timetable HTML
  const timeSlots = generateTimeSlots(params.startTime, params.endTime);
  const workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  let timetableHTML = `
    <div class="timetable-meta">
      <div class="meta-info">
        <p><strong>Course:</strong> ${params.course}</p>
        <p><strong>Department:</strong> ${params.department}</p>
        <p><strong>Semester:</strong> ${params.semester}</p>
      </div>
      <div class="meta-info">
        <p><strong>Students:</strong> ${params.students}</p>
        <p><strong>Timing:</strong> ${params.startTime} - ${params.endTime}</p>
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
          ${timeSlots
            .map(
              (slot) => `
            <tr class="time-row">
              <td class="time-cell">
                <div class="time-slot">
                  <span class="start-time">${slot.startTime}</span>
                  <span class="end-time">${slot.endTime}</span>
                </div>
              </td>
        ${workingDays
          .map((day) => {
            const session = timetableData[day] && timetableData[day][slot.id];
            if (!session) {
              return '<td class="empty-slot">-</td>';
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
                        ${session.duration > 1 ? `<div class="session-duration">${session.duration}h</div>` : ""}
                      </div>
                    </div>
                  </td>
                `;
          })
          .join("")}
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="timetable-actions">
      <button onclick="saveTimetable()" title="Save Timetable" class="timetable-action-btn save-btn">
        <img src="res/save.svg" alt="Save">
        Save Timetable
      </button>
      <button onclick="deleteTimetable()" title="Delete Timetable" class="timetable-action-btn delete-btn">
        <img src="res/delete.svg" alt="Delete">
        Delete Timetable
      </button>
    </div>
  `;

  // Store current timetable data globally
  currentGeneratedTimetable = {
    timetableData,
    params,
  };

  // Show subject summary
  const subjectSummaryHTML = generateSubjectSummary(params);

  dynamicTimetable.innerHTML = timetableHTML;

  // Show subject summary section
  const subjectSummary = document.getElementById("subject-summary");
  if (subjectSummary && subjectSummaryHTML) {
    document.getElementById("subject-stats-grid").innerHTML = subjectSummaryHTML;
    subjectSummary.style.display = "block";
  }

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
      timetable: timetableData,
      generatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_BASE}/api/timetables`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(timetableToSave),
    });

    if (response.ok) {
      const savedTimetable = await response.json();
      showToast("Timetable saved successfully!", "success");

      // Update UI to show it's saved (maybe change button states)
      updateTimetableActionButtons(true, savedTimetable.id);

      console.log("✅ Timetable saved with ID:", savedTimetable.id);

      // Refresh saved timetables list and scroll to it
      lastSavedTimetableId = savedTimetable.id;
      await renderSavedTimetables();
      scrollToSavedTimetable(savedTimetable.id);
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

  if (!confirm("Are you sure you want to delete this timetable? This will clear the display.")) {
    return;
  }

  try {
    // Clear the timetable display
    const dynamicTimetable = document.getElementById("dynamic-timetable");
    const timetableTitle = document.getElementById("timetable-title");
    const subjectSummary = document.getElementById("subject-summary");

    if (dynamicTimetable) {
      dynamicTimetable.innerHTML =
        '<p class="empty-state">No timetable generated yet. Use the generator above to create a new timetable.</p>';
    }

    if (timetableTitle) {
      timetableTitle.textContent = "Generated Timetable";
    }

    if (subjectSummary) {
      subjectSummary.style.display = "none";
    }

    // Clear the current timetable data
    currentGeneratedTimetable = null;

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
    const response = await fetch(`${API_BASE}/api/timetables`);
    if (!response.ok) throw new Error("Failed to load saved timetables");
    const saved = await response.json();

    const section = document.getElementById("saved-timetables-section");
    const list = document.getElementById("savedTimetablesList");
    if (!section || !list) return;

    if (!saved || saved.length === 0) {
      section.style.display = "none";
      list.innerHTML = "";
      return;
    }

    // Sort by Course > Department > Semester number
    const semesterNum = (s) => {
      const m = /Semester\s*(\d+)/i.exec(s || "");
      return m ? parseInt(m[1], 10) : 0;
    };
    saved.sort((a, b) => {
      const c = (a.course || "").localeCompare(b.course || "");
      if (c !== 0) return c;
      const d = (a.department || "").localeCompare(b.department || "");
      if (d !== 0) return d;
      return semesterNum(a.semester) - semesterNum(b.semester);
    });

    // Newest saved first within same group (optional)
    // saved.sort((a,b)=> new Date(b.savedAt)-new Date(a.savedAt));

    section.style.display = "block";
    list.innerHTML = saved
      .map(
        (t) => `
        <div class="saved-timetable-card" id="saved-tt-${t.id}">
          <div class="saved-timetable-header">
            <div class="saved-timetable-title">
              ${t.course} • ${t.department} • ${t.semester}
            </div>
            <div class="saved-timetable-meta">
              <span>${new Date(t.savedAt || t.generatedAt || Date.now()).toLocaleString()}</span>
              <button class="small-btn danger" onclick="deleteSavedTimetable('${t.id}')">Delete</button>
            </div>
          </div>
          <div class="saved-timetable-body">
            ${renderMiniTableGrid(t.timetable)}
          </div>
        </div>`
      )
      .join("");
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
      return `<div class=\"mini-row\"><b>${day}:</b> ${first.subject} (${first.type}) - ${first.startTime}-${first.endTime}</div>`;
    })
    .join("");
  return `<div class="mini-grid">${rows}</div>`;
}

async function deleteSavedTimetable(id) {
  if (!confirm("Delete this saved timetable?")) return;
  try {
    const res = await fetch(`${API_BASE}/api/timetables/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete saved timetable");
    await renderSavedTimetables();
    showToast("Saved timetable deleted", "success");
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
 * Generate subject summary for the timetable
 */
function generateSubjectSummary(params) {
  const filteredSubjects = subjects.filter(
    (s) => s.course === params.course && s.department === params.department && s.semester === params.semester
  );

  return filteredSubjects
    .map(
      (subject) => `
    <div class="subject-stat-card">
      <h4>${subject.name} (${subject.code})</h4>
      <div class="subject-stat-details">
        <p><strong>Faculty:</strong> ${subject.assignedFaculty}</p>
        <p><strong>Lectures:</strong> ${subject.lectureHours} hours/week</p>
        <p><strong>Labs:</strong> ${subject.labHours} hours/week</p>
        <p><strong>Total:</strong> ${subject.totalHours} hours/week</p>
      </div>
    </div>
  `
    )
    .join("");
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
 * Validate department data
 */
function validateDepartmentData(data) {
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    showToast("Please enter a department name", "error");
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
  if (!confirm("Are you sure you want to delete this subject?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/subjects/${subjectId}`, {
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
  if (!confirm("Are you sure you want to delete this faculty member?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/faculty/${facultyId}`, {
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
  if (!confirm("Are you sure you want to delete this room?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/rooms/${roomId}`, {
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
 * Delete department
 */
async function deleteDepartment(index) {
  if (!confirm("Are you sure you want to delete this department? This action cannot be undone if the department is being used by existing faculty or subjects.")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/departments/${index}`, {
      method: "DELETE",
    });

    if (response.ok) {
      departments.splice(index, 1);
      renderDepartments();
      populateAllDropdowns(); // Refresh department dropdowns everywhere
      showToast("Department deleted successfully!", "success");
      if (typeof updateStatistics === "function") {
        updateStatistics();
      }
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete department");
    }
  } catch (error) {
    console.error("Error deleting department:", error);
    showToast(error.message || "Failed to delete department. Please try again.", "error");
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
 * Edit department
 */
function editDepartment(index) {
  const department = departments[index];
  if (!department) {
    showToast("Department not found!", "error");
    return;
  }

  // Populate the form with existing data
  const form = document.getElementById("departmentForm");
  if (form) {
    form.querySelector('[name="departmentName"]').value = department;

    // Change form to edit mode
    form.dataset.editIndex = index;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = "Update Department";
    }

    // Scroll to form
    form.scrollIntoView({ behavior: "smooth" });
    showToast("Edit mode activated. Update the fields and submit.", "info");
  }
}
/**
 * ========================================
 * UTILITY FUNCTIONS
 * ========================================
 */

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
  initializeTimetableSystem();
});

// Export functions for global access
window.deleteSubject = deleteSubject;
window.deleteFaculty = deleteFaculty;
window.deleteRoom = deleteRoom;
window.deleteDepartment = deleteDepartment;
window.editSubject = editSubject;
window.editFaculty = editFaculty;
window.editRoom = editRoom;
window.editDepartment = editDepartment;
window.scrollToGenerator = scrollToGenerator;
window.getSubjects = getSubjects;
window.getFaculty = getFaculty;
window.getRooms = getRooms;
window.saveTimetable = saveTimetable;
window.deleteTimetable = deleteTimetable;
window.deleteSavedTimetable = deleteSavedTimetable;
window.focusTimetableTabAndScroll = focusTimetableTabAndScroll;
