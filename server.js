const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 3000;
const DATABASE_FILE = path.join(__dirname, "database.json");
const JWT_SECRET = "timetable_jwt_secret_key_2025"; // In production, use environment variable
const SESSION_SECRET = "timetable_session_secret_2025"; // In production, use environment variable

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Parse cookies
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
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
      users: [
        {
          id: "admin_default_001",
          email: "fafyxuluj@mailinator.com",
          password: "$2b$10$hA0ay8TXM/8C5HrwBA.KJ.dRDeiVb7pe91nm5RbLZpCzlOoeQGdN.", // 1234@Kunj
          firstName: "System",
          lastName: "Administrator",
          role: "admin",
          institution: "Default Institution",
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          profileData: {
            department: null,
            semester: null,
            facultyId: null,
          },
        },
      ],
      userSessions: [],
      settings: {
        defaultCollegeStartTime: "09:00",
        defaultCollegeEndTime: "17:00",
        defaultSlotsPerDay: 6,
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      },
    };
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(initialData, null, 2));
    console.log("✅ Database file created with default admin user");
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

// ===========================================
// AUTHENTICATION HELPER FUNCTIONS
// ===========================================

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ error: "Access token required" });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  req.user = user;
  next();
}

// Role-based authorization middleware
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

// Check if user exists and get by email
function getUserByEmail(email) {
  const database = readDatabase();
  if (!database || !database.users) return null;

  return database.users.find((user) => user.email === email && user.isActive);
}

// Get user by ID
function getUserById(id) {
  const database = readDatabase();
  if (!database || !database.users) return null;

  return database.users.find((user) => user.id === id && user.isActive);
}

// Update user's last login
function updateLastLogin(userId) {
  const database = readDatabase();
  if (!database || !database.users) return false;

  const userIndex = database.users.findIndex((user) => user.id === userId);
  if (userIndex !== -1) {
    database.users[userIndex].lastLogin = new Date().toISOString();
    return writeDatabase(database);
  }
  return false;
}

// Routes

// ===========================================
// DEFAULT ROUTE
// ===========================================

// Serve welcome page as default
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "welcome.html"));
});

// ===========================================
// AUTHENTICATION ROUTES
// ===========================================

// User registration
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, institution, profileData } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !role || !institution) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!["admin", "teacher", "student"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Check if user already exists
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      institution,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      profileData: profileData || {
        department: null,
        semester: null,
        facultyId: null,
      },
    };

    // Save to database
    const database = readDatabase();
    if (!database) {
      return res.status(500).json({ error: "Database error" });
    }

    if (!database.users) {
      database.users = [];
    }

    database.users.push(newUser);

    if (writeDatabase(database)) {
      // Generate token
      const token = generateToken(newUser);

      // Remove password from response
      const { password: _, ...userResponse } = newUser;

      res.status(201).json({
        message: "User registered successfully",
        user: userResponse,
        token,
      });

      console.log("✅ User registered:", email, "Role:", role);
    } else {
      res.status(500).json({ error: "Failed to save user" });
    }
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Get user
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Update last login
    updateLastLogin(user.id);

    // Generate token
    const token = generateToken(user);

    // Store session
    req.session.userId = user.id;
    req.session.userRole = user.role;

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      message: "Login successful",
      user: userResponse,
      token,
    });

    console.log("✅ User logged in:", email, "Role:", user.role);
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User logout
app.post("/api/auth/logout", authenticateToken, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out" });
    }
    res.json({ message: "Logout successful" });
  });
});

// Get current user profile
app.get("/api/auth/profile", authenticateToken, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { password: _, ...userResponse } = user;
  res.json(userResponse);
});

// Update user profile
app.put("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, institution, profileData } = req.body;

    const database = readDatabase();
    if (!database) {
      return res.status(500).json({ error: "Database error" });
    }

    const userIndex = database.users.findIndex((user) => user.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user data
    if (firstName) database.users[userIndex].firstName = firstName;
    if (lastName) database.users[userIndex].lastName = lastName;
    if (institution) database.users[userIndex].institution = institution;
    if (profileData)
      database.users[userIndex].profileData = {
        ...database.users[userIndex].profileData,
        ...profileData,
      };

    database.users[userIndex].updatedAt = new Date().toISOString();

    if (writeDatabase(database)) {
      const { password: _, ...userResponse } = database.users[userIndex];
      res.json({
        message: "Profile updated successfully",
        user: userResponse,
      });
    } else {
      res.status(500).json({ error: "Failed to update profile" });
    }
  } catch (error) {
    console.error("❌ Profile update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify token endpoint
app.post("/api/auth/verify", (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const user = getUserById(decoded.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { password: _, ...userResponse } = user;
  res.json({ valid: true, user: userResponse });
});

// ===========================================
// MAIN APPLICATION ROUTES
// ===========================================

// Routes

// GET - Read entire database (Admin only)
app.get("/api/database", authenticateToken, requireRole(["admin"]), (req, res) => {
  const database = readDatabase();
  if (database) {
    res.json(database);
  } else {
    res.status(500).json({ error: "Failed to read database" });
  }
});

// GET - Get filtered data based on user role
app.get("/api/data", authenticateToken, (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const userRole = req.user.role;
  const userId = req.user.id;

  switch (userRole) {
    case "admin":
      // Admin gets all data
      res.json(database);
      break;

    case "teacher":
      // Teachers get their own assigned subjects and related timetables
      const teacherUser = getUserById(userId);
      const teacherFaculty = database.faculty.find((f) => f.email === req.user.email);

      if (teacherFaculty) {
        const teacherSubjects = database.subjects.filter((s) => s.assignedFaculty === teacherFaculty.name);
        const teacherTimetables = database.savedTimetables.filter((t) => {
          return Object.values(t.timetable || {}).some((day) =>
            Object.values(day || {}).some((slot) => slot && slot.faculty === teacherFaculty.name)
          );
        });

        res.json({
          subjects: teacherSubjects,
          faculty: [teacherFaculty],
          savedTimetables: teacherTimetables,
          semesters: database.semesters,
          departments: database.departments,
          courses: database.courses,
          rooms: database.rooms,
          roomTypes: database.roomTypes,
        });
      } else {
        res.json({
          subjects: [],
          faculty: [],
          savedTimetables: [],
          semesters: database.semesters,
          departments: database.departments,
          courses: database.courses,
          rooms: database.rooms,
          roomTypes: database.roomTypes,
        });
      }
      break;

    case "student":
      // Students get only their semester's timetable
      const studentUser = getUserById(userId);
      const studentData = studentUser.profileData || {};

      let studentTimetables = [];
      if (studentData.department && studentData.semester) {
        studentTimetables = database.savedTimetables.filter(
          (t) => t.department === studentData.department && t.semester === studentData.semester
        );
      }

      res.json({
        savedTimetables: studentTimetables,
        semesters: database.semesters,
        departments: database.departments,
        courses: database.courses,
        subjects: [], // Students don't need subject details
        faculty: [], // Students don't need faculty details
        rooms: database.rooms,
        roomTypes: database.roomTypes,
      });
      break;

    default:
      res.status(403).json({ error: "Invalid user role" });
  }
});

// POST - Add new subject (Admin only)
app.post("/api/subjects", authenticateToken, requireRole(["admin"]), (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const newSubject = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    ...req.body,
    createdAt: new Date().toISOString(),
    createdBy: req.user.id,
  };

  database.subjects.push(newSubject);

  if (writeDatabase(database)) {
    res.json(newSubject);
    console.log("✅ Subject added:", newSubject.name, "by", req.user.email);
  } else {
    res.status(500).json({ error: "Failed to save subject" });
  }
});

// POST - Add new faculty (Admin only)
app.post("/api/faculty", authenticateToken, requireRole(["admin"]), (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const newFaculty = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    ...req.body,
    createdAt: new Date().toISOString(),
    createdBy: req.user.id,
  };

  database.faculty.push(newFaculty);

  if (writeDatabase(database)) {
    res.json(newFaculty);
    console.log("✅ Faculty added:", newFaculty.name, "by", req.user.email);
  } else {
    res.status(500).json({ error: "Failed to save faculty" });
  }
});

// POST - Add new room (Admin only)
app.post("/api/rooms", authenticateToken, requireRole(["admin"]), (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }

  const newRoom = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    ...req.body,
    createdAt: new Date().toISOString(),
    createdBy: req.user.id,
  };

  database.rooms.push(newRoom);

  if (writeDatabase(database)) {
    res.json(newRoom);
    console.log("✅ Room added:", newRoom.number, "by", req.user.email);
  } else {
    res.status(500).json({ error: "Failed to save room" });
  }
});

// DELETE - Delete subject (Admin only)
app.delete("/api/subjects/:id", authenticateToken, requireRole(["admin"]), (req, res) => {
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

// DELETE - Delete faculty (Admin only)
app.delete("/api/faculty/:id", authenticateToken, requireRole(["admin"]), (req, res) => {
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

// DELETE - Delete room (Admin only)
app.delete("/api/rooms/:id", authenticateToken, requireRole(["admin"]), (req, res) => {
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

// PUT - Update subject (Admin only)
app.put("/api/subjects/:id", authenticateToken, requireRole(["admin"]), (req, res) => {
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

// PUT - Update faculty (Admin only)
app.put("/api/faculty/:id", authenticateToken, requireRole(["admin"]), (req, res) => {
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

// PUT - Update room (Admin only)
app.put("/api/rooms/:id", authenticateToken, requireRole(["admin"]), (req, res) => {
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
app.get("/api/departments", authenticateToken, (req, res) => {
  const database = readDatabase();
  if (!database) {
    return res.status(500).json({ error: "Failed to read database" });
  }
  res.json(database.departments || []);
});

// POST - Add new department (Admin only)
app.post("/api/departments", authenticateToken, requireRole(["admin"]), (req, res) => {
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

// PUT - Update department (Admin only)
app.put("/api/departments/:index", authenticateToken, requireRole(["admin"]), (req, res) => {
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

// DELETE - Delete department (Admin only)
app.delete("/api/departments/:index", authenticateToken, requireRole(["admin"]), (req, res) => {
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

// Save timetable (Admin only)
app.post("/api/timetables", authenticateToken, requireRole(["admin"]), (req, res) => {
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
      createdBy: req.user.id,
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

// Delete timetable (Admin only)
app.delete("/api/timetables/:id", authenticateToken, requireRole(["admin"]), (req, res) => {
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

// Get saved timetables (Role-based access)
app.get("/api/timetables", authenticateToken, (req, res) => {
  try {
    const database = readDatabase();
    if (!database) {
      return res.status(500).json({ error: "Failed to read database" });
    }

    const userRole = req.user.role;
    const userId = req.user.id;
    const savedTimetables = database.savedTimetables || [];

    switch (userRole) {
      case "admin":
        // Admin gets all timetables
        res.json(savedTimetables);
        break;

      case "teacher":
        // Teachers get timetables where they are assigned
        const teacherUser = getUserById(userId);
        const teacherFaculty = database.faculty.find((f) => f.email === req.user.email);

        if (teacherFaculty) {
          const teacherTimetables = savedTimetables.filter((t) => {
            return Object.values(t.timetable || {}).some((day) =>
              Object.values(day || {}).some((slot) => slot && slot.faculty === teacherFaculty.name)
            );
          });
          res.json(teacherTimetables);
        } else {
          res.json([]);
        }
        break;

      case "student":
        // Students get only their semester's timetables
        const studentUser = getUserById(userId);
        const studentData = studentUser.profileData || {};

        let studentTimetables = [];
        if (studentData.department && studentData.semester) {
          studentTimetables = savedTimetables.filter(
            (t) => t.department === studentData.department && t.semester === studentData.semester
          );
        }
        res.json(studentTimetables);
        break;

      default:
        res.status(403).json({ error: "Invalid user role" });
    }
  } catch (error) {
    console.error("❌ Error getting timetables:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST - Add new course-department combination (Admin only)
app.post("/api/course-departments", authenticateToken, requireRole(["admin"]), (req, res) => {
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

// DELETE - Delete course-department combination (Admin only)
app.delete("/api/course-departments/:id", authenticateToken, requireRole(["admin"]), (req, res) => {
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
