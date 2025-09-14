const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;
const DATABASE_FILE = path.join(__dirname, "database.json");

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.static(".")); // Serve static files from current directory

// Initialize database file if it doesn't exist
function initializeDatabase() {
  if (!fs.existsSync(DATABASE_FILE)) {
    const initialData = {
      subjects: [],
      faculty: [],
      rooms: [],
      courses: [],
      departments: [],
      courseDepartments: [],
      semesters: [
        "Semester 1",
        "Semester 2",
        "Semester 3",
        "Semester 4",
        "Semester 5",
        "Semester 6",
        "Semester 7",
        "Semester 8",
      ],
      roomTypes: ["Lecture Hall", "Computer Lab", "Laboratory", "Seminar Hall", "Auditorium"],
      generatedTimetables: [],
      savedTimetables: [],
      settings: {
        defaultCollegeStartTime: "09:00",
        defaultCollegeEndTime: "17:00",
        defaultSlotsPerDay: 6,
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      },
    };
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(initialData, null, 2));
    console.log("✅ Database file created");
  }
}

// Helper function to read database
function readDatabase() {
  try {
    const data = fs.readFileSync(DATABASE_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Error reading database:", error);
    return null;
  }
}

// Helper function to write database
function writeDatabase(data) {
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("❌ Error writing database:", error);
    return false;
  }
}

// Routes

// GET - Read entire database
app.get("/api/database", (req, res) => {
  const database = readDatabase();
  if (database) {
    res.json(database);
  } else {
    res.status(500).json({ error: "Failed to read database" });
  }
});

// POST - Add new subject
app.post("/api/subjects", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const newSubject = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    ...req.body,
    createdAt: new Date().toISOString(),
  };

  database.subjects.push(newSubject);

  if (writeDatabase(database)) {
    res.json(newSubject);
    console.log("✅ Subject added:", newSubject.name);
  } else {
    res.status(500).json({ error: "Failed to save subject" });
  }
});

// POST - Add new faculty
app.post("/api/faculty", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const newFaculty = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    ...req.body,
    createdAt: new Date().toISOString(),
  };

  database.faculty.push(newFaculty);

  if (writeDatabase(database)) {
    res.json(newFaculty);
    console.log("✅ Faculty added:", newFaculty.name);
  } else {
    res.status(500).json({ error: "Failed to save faculty" });
  }
});

// POST - Add new room
app.post("/api/rooms", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const newRoom = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    ...req.body,
    createdAt: new Date().toISOString(),
  };

  database.rooms.push(newRoom);

  if (writeDatabase(database)) {
    res.json(newRoom);
    console.log("✅ Room added:", newRoom.number);
  } else {
    res.status(500).json({ error: "Failed to save room" });
  }
});

// DELETE - Delete subject
app.delete("/api/subjects/:id", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const subjectId = req.params.id;
  const index = database.subjects.findIndex((s) => s.id === subjectId);

  if (index === -1) {
    return res.status(404).json({ error: "Subject not found" });
  }

  const deleted = database.subjects.splice(index, 1)[0];

  if (writeDatabase(database)) {
    res.json(deleted);
    console.log("🗑️ Subject deleted:", deleted.name);
  } else {
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

// DELETE - Delete faculty
app.delete("/api/faculty/:id", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const facultyId = req.params.id;
  const index = database.faculty.findIndex((f) => f.id === facultyId);

  if (index === -1) {
    return res.status(404).json({ error: "Faculty not found" });
  }

  const deleted = database.faculty.splice(index, 1)[0];

  if (writeDatabase(database)) {
    res.json(deleted);
    console.log("🗑️ Faculty deleted:", deleted.name);
  } else {
    res.status(500).json({ error: "Failed to delete faculty" });
  }
});

// DELETE - Delete room
app.delete("/api/rooms/:id", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const roomId = req.params.id;
  const index = database.rooms.findIndex((r) => r.id === roomId);

  if (index === -1) {
    return res.status(404).json({ error: "Room not found" });
  }

  const deleted = database.rooms.splice(index, 1)[0];

  if (writeDatabase(database)) {
    res.json(deleted);
    console.log("🗑️ Room deleted:", deleted.number);
  } else {
    res.status(500).json({ error: "Failed to delete room" });
  }
});

// PUT - Update subject
app.put("/api/subjects/:id", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const subjectId = req.params.id;
  const index = database.subjects.findIndex((s) => s.id === subjectId);

  if (index === -1) {
    return res.status(404).json({ error: "Subject not found" });
  }

  database.subjects[index] = { ...database.subjects[index], ...req.body };

  if (writeDatabase(database)) {
    res.json(database.subjects[index]);
    console.log("✏️ Subject updated:", database.subjects[index].name);
  } else {
    res.status(500).json({ error: "Failed to update subject" });
  }
});

// PUT - Update faculty
app.put("/api/faculty/:id", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const facultyId = req.params.id;
  const index = database.faculty.findIndex((f) => f.id === facultyId);

  if (index === -1) {
    return res.status(404).json({ error: "Faculty not found" });
  }

  database.faculty[index] = { ...database.faculty[index], ...req.body };

  if (writeDatabase(database)) {
    res.json(database.faculty[index]);
    console.log("✏️ Faculty updated:", database.faculty[index].name);
  } else {
    res.status(500).json({ error: "Failed to update faculty" });
  }
});

// PUT - Update room
app.put("/api/rooms/:id", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const roomId = req.params.id;
  const index = database.rooms.findIndex((r) => r.id === roomId);

  if (index === -1) {
    return res.status(404).json({ error: "Room not found" });
  }

  database.rooms[index] = { ...database.rooms[index], ...req.body };

  if (writeDatabase(database)) {
    res.json(database.rooms[index]);
    console.log("✏️ Room updated:", database.rooms[index].number);
  } else {
    res.status(500).json({ error: "Failed to update room" });
  }
});

// ===========================================
// DEPARTMENTS API ROUTES
// ===========================================

// GET - Get all departments
app.get("/api/departments", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }
  res.json(database.departments || []);
});

// POST - Add new department
app.post("/api/departments", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Department name is required" });
  }

  const trimmedName = name.trim();

  // Check if department already exists
  if (database.departments.includes(trimmedName)) {
    return res.status(400).json({ error: "Department already exists" });
  }

  database.departments.push(trimmedName);

  if (writeDatabase(database)) {
    res.json({ name: trimmedName });
    console.log("✅ Department added:", trimmedName);
  } else {
    res.status(500).json({ error: "Failed to save department" });
  }
});

// PUT - Update department
app.put("/api/departments/:index", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const index = parseInt(req.params.index);
  const { name } = req.body;

  if (isNaN(index) || index < 0 || index >= database.departments.length) {
    return res.status(404).json({ error: "Department not found" });
  }

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Department name is required" });
  }

  const trimmedName = name.trim();
  const oldName = database.departments[index];

  // Check if new name already exists (except for current one)
  if (database.departments.includes(trimmedName) && database.departments[index] !== trimmedName) {
    return res.status(400).json({ error: "Department already exists" });
  }

  database.departments[index] = trimmedName;

  if (writeDatabase(database)) {
    res.json({ oldName, newName: trimmedName });
    console.log("✏️ Department updated:", `${oldName} → ${trimmedName}`);
  } else {
    res.status(500).json({ error: "Failed to update department" });
  }
});

// DELETE - Delete department
app.delete("/api/departments/:index", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const index = parseInt(req.params.index);

  if (isNaN(index) || index < 0 || index >= database.departments.length) {
    return res.status(404).json({ error: "Department not found" });
  }

  // Check if department is being used by any faculty or subjects
  const departmentName = database.departments[index];
  const usedInFaculty = database.faculty.some((f) => f.department === departmentName);
  const usedInSubjects = database.subjects.some((s) => s.department === departmentName);

  if (usedInFaculty || usedInSubjects) {
    return res.status(400).json({
      error: "Cannot delete department. It is being used by existing faculty or subjects.",
    });
  }

  const deleted = database.departments.splice(index, 1)[0];

  if (writeDatabase(database)) {
    res.json({ name: deleted });
    console.log("🗑️ Department deleted:", deleted);
  } else {
    res.status(500).json({ error: "Failed to delete department" });
  }
});

// ===========================================
// TIMETABLE API ROUTES
// ===========================================

// Save timetable
app.post("/api/timetables", (req, res) => {
  try {
    const database = readDatabase();
    if (!database) {
      return res.status(500).json({ error: "Failed to read database" });
    }

    const timetableData = req.body;

    // Add unique ID and timestamp
    const timetableId = Date.now().toString();
    const savedTimetable = {
      id: timetableId,
      ...timetableData,
      savedAt: new Date().toISOString(),
    };

    // Initialize savedTimetables array if it doesn't exist
    if (!database.savedTimetables) {
      database.savedTimetables = [];
    }

    database.savedTimetables.push(savedTimetable);

    if (writeDatabase(database)) {
      res.json(savedTimetable);
      console.log(
        "💾 Timetable saved:",
        `${timetableData.course} - ${timetableData.department} - ${timetableData.semester}`
      );
    } else {
      res.status(500).json({ error: "Failed to save timetable" });
    }
  } catch (error) {
    console.error("❌ Error saving timetable:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete timetable
app.delete("/api/timetables/:id", (req, res) => {
  try {
    const database = readDatabase();
    if (!database) {
      return res.status(500).json({ error: "Failed to read database" });
    }

    const timetableId = req.params.id;

    if (!database.savedTimetables) {
      return res.status(404).json({ error: "No saved timetables found" });
    }

    const index = database.savedTimetables.findIndex((t) => t.id === timetableId);
    if (index !== -1) {
      const deletedTimetable = database.savedTimetables[index];
      database.savedTimetables.splice(index, 1);

      if (writeDatabase(database)) {
        res.json({ message: "Timetable deleted successfully" });
        console.log(
          "🗑️ Timetable deleted:",
          `${deletedTimetable.course} - ${deletedTimetable.department} - ${deletedTimetable.semester}`
        );
      } else {
        res.status(500).json({ error: "Failed to delete timetable" });
      }
    } else {
      res.status(404).json({ error: "Timetable not found" });
    }
  } catch (error) {
    console.error("❌ Error deleting timetable:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get saved timetables
app.get("/api/timetables", (req, res) => {
  try {
    const database = readDatabase();
    if (!database) {
      return res.status(500).json({ error: "Failed to read database" });
    }

    const savedTimetables = database.savedTimetables || [];
    res.json(savedTimetables);
  } catch (error) {
    console.error("❌ Error getting timetables:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST - Add new course-department combination
app.post("/api/course-departments", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const { course, department } = req.body;

  const newCourseDepartment = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    course,
    department,
    createdAt: new Date().toISOString(),
  };

  // Add to courseDepartments array
  database.courseDepartments.push(newCourseDepartment);

  // Also maintain separate courses and departments arrays
  if (!database.courses.includes(course)) {
    database.courses.push(course);
  }
  if (!database.departments.includes(department)) {
    database.departments.push(department);
  }

  if (writeDatabase(database)) {
    res.status(201).json(newCourseDepartment);
    console.log("➕ Course-Department added:", `${course} - ${department}`);
  } else {
    res.status(500).json({ error: "Failed to add course-department combination" });
  }
});

// DELETE - Delete course-department combination
app.delete("/api/course-departments/:id", (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const courseDepartmentId = req.params.id;
  const index = database.courseDepartments.findIndex((cd) => cd.id === courseDepartmentId);

  if (index === -1) {
    return res.status(404).json({ error: "Course-Department combination not found" });
  }

  const deleted = database.courseDepartments.splice(index, 1)[0];

  // Rebuild courses and departments arrays from remaining courseDepartments
  database.courses = [...new Set(database.courseDepartments.map((cd) => cd.course))];
  database.departments = [...new Set(database.courseDepartments.map((cd) => cd.department))];

  if (writeDatabase(database)) {
    res.json(deleted);
    console.log("🗑️ Course-Department deleted:", `${deleted.course} - ${deleted.department}`);
  } else {
    res.status(500).json({ error: "Failed to delete course-department combination" });
  }
});

// PUT - Update settings
app.put("/api/settings", (req, res) => {
  try {
    const database = readDatabase();
    if (!database) {
      return res.status(500).json({ error: "Failed to read database" });
    }

    const { defaultSlotsPerDay } = req.body;

    if (!database.settings) {
      database.settings = {};
    }

    // Update the specific setting
    if (defaultSlotsPerDay !== undefined) {
      database.settings.defaultSlotsPerDay = parseInt(defaultSlotsPerDay);
      console.log(`⚙️ Settings updated: defaultSlotsPerDay = ${defaultSlotsPerDay}`);
    }

    if (writeDatabase(database)) {
      res.json({ message: "Settings updated successfully", settings: database.settings });
    } else {
      res.status(500).json({ error: "Failed to update settings" });
    }
  } catch (error) {
    console.error("❌ Error updating settings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Initialize and start server
initializeDatabase();

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Database file: ${DATABASE_FILE}`);
  console.log(`💡 Visit http://localhost:${PORT} to access your timetable generator`);
});
