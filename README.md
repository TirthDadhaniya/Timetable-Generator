# 🎓 Advanced Timetable Generator

A comprehensive, intelligent timetable generation system with advanced scheduling algorithms, real-time editing capabilities, and persistent data storage.

## ✨ Features

### 🔥 **Core Features**

- ✅ **Smart Timetable Generation**: Advanced multi-pass randomized scheduling algorithm
- ✅ **Real-time Editing**: Edit subjects, faculty, and rooms with instant UI updates
- ✅ **Auto-Update Logic**: Duplicate entries automatically update existing records
- ✅ **Live Statistics**: Dashboard shows real-time counts with animated counters
- ✅ **Conflict Resolution**: Intelligent scheduling prevents faculty/room conflicts
- ✅ **Lab Session Management**: Flexible lab duration (2-4 hours) with consecutive slot booking

### 💾 **Data Management**

- ✅ **True Data Persistence**: Data saved to `database.json` with backend API
- ✅ **Multi-Entity Management**: Subjects, Faculty, Rooms with comprehensive details
- ✅ **Cross-Reference Integrity**: Faculty assignments sync across all forms
- ✅ **Real-time Updates**: Changes immediately reflect across all components
- ✅ **Browser Refresh Safe**: Data persists through page reloads

### 🧠 **Advanced Algorithm Features**

- ✅ **Randomized Distribution**: Fisher-Yates shuffle for varied timetable patterns
- ✅ **Multi-Pass Scheduling**: Up to 3 attempts for optimal slot allocation
- ✅ **Constraint Satisfaction**: Respects all academic and resource constraints
- ✅ **Lab Optimization**: One lab per day rule with smart consecutive slot booking
- ✅ **Back-to-Back Prevention**: Avoids consecutive lectures of same subject
- ✅ **Daily Subject Tracking**: Ensures subjects don't repeat on same day

### 🎯 **User Experience**

- ✅ **Interactive Dashboard**: Clean, responsive interface with toast notifications
- ✅ **Form Auto-Population**: Edit mode pre-fills all form fields
- ✅ **Visual Feedback**: Loading states, success/error messages, progress indicators
- ✅ **Comprehensive Validation**: Input validation with helpful error messages
- ✅ **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v14 or higher) - Download from [nodejs.org](https://nodejs.org/)
- **Web Browser** - Chrome, Firefox, Safari, or Edge

### Installation

1. **Clone or Download** the project to your local machine

2. **Install Dependencies**

   ```bash
   cd "Time Table Generator Final - Copy"
   npm install
   ```

3. **Start the Server**

   ```bash
   npm start
   ```

   Or for development with auto-restart:

   ```bash
   npm run dev
   ```

4. **Open Application**
   Navigate to: `http://localhost:3000`

## 📋 How to Use

### 1. **Managing Data**

#### ➕ Adding Subjects

- Fill out the subject form with:
  - Subject Name & Code (unique identifier)
  - Course, Department, Semester
  - Lecture Hours (per week)
  - Lab Hours (per week)
  - Lab Duration (2-4 hours per session)
  - Assigned Faculty
- Click "Add Subject" to save

#### 👨‍🏫 Adding Faculty

- Enter faculty details:
  - Name & Email (unique identifier)
  - Specialization & Department
- Click "Add Faculty" to save

#### 🏢 Adding Rooms

- Configure room details:
  - Room Number (unique identifier)
  - Type (Classroom, Lab, Hall, etc.)
  - Building, Floor, Capacity
  - Available Equipment
- Click "Add Room" to save

### 2. **Editing Existing Data**

- Click the **Edit** button (✏️) on any subject/faculty/room card
- Form will auto-populate with current data
- Modify fields and click "Update" to save changes
- **Auto-Update**: Entering duplicate codes/emails will automatically update existing records

### 3. **Generating Timetables**

#### 📝 Setup Parameters

- Select Course, Department, Semester
- Enter number of students
- Set college start and end time
- Click "Generate Timetable"

#### 🧠 Algorithm Features

The advanced scheduling system:

- **Randomizes** subject order for varied patterns
- **Prevents conflicts** between faculty and rooms
- **Schedules labs** in consecutive slots (2-4 hours)
- **Distributes subjects** across different days
- **Avoids back-to-back** lectures of same subject
- **Ensures one lab per day** maximum
- **Makes 3 attempts** for optimal scheduling

### 4. **Viewing Results**

- **Live Statistics**: Dashboard shows real-time counts
- **Generated Timetable**: Visual grid with all sessions
- **Subject Summary**: Overview of scheduled hours per subject
- **Session Details**: Faculty, room, and timing for each slot

## 🏗️ System Architecture

### 🖥️ Backend (Node.js Server)

- **`server.js`**: Express server with comprehensive REST API
- **Port**: 3000 (configurable in code)
- **Database**: `database.json` for persistent storage
- **CORS Support**: Cross-origin requests enabled

**API Endpoints**:

```
GET    /api/database           # Get all data
POST   /api/subjects          # Add new subject
PUT    /api/subjects/:id      # Update existing subject
DELETE /api/subjects/:id      # Delete subject
POST   /api/faculty           # Add new faculty
PUT    /api/faculty/:id       # Update existing faculty
DELETE /api/faculty/:id       # Delete faculty
POST   /api/rooms             # Add new room
PUT    /api/rooms/:id         # Update existing room
DELETE /api/rooms/:id         # Delete room
```

### 🎨 Frontend Architecture

- **`index.html`**: Main interface with responsive tabs and forms
- **`timetable.js`**: Core logic (1600+ lines)
  - Timetable generation algorithm
  - CRUD operations and API integration
  - Form handling and validation
  - Edit functionality with auto-population
- **`script.js`**: UI interactions and statistics
  - Tab switching and navigation
  - Statistics display with animations
  - Toast notifications
- **`style.css`**: Modern responsive design
  - Clean card-based layouts
  - Mobile-friendly interface
  - Loading states and animations

### 📊 Data Structure

**Database Schema** (`database.json`):

```json
{
  "subjects": [
    {
      "id": "unique_id",
      "name": "Subject Name",
      "code": "SUB001",
      "course": "BTech",
      "department": "Computer Science",
      "semester": "Semester 7",
      "lectureHours": 3,
      "labHours": 4,
      "labDuration": 2,
      "totalHours": 7,
      "assignedFaculty": "Prof. Name"
    }
  ],
  "faculty": [
    {
      "id": "unique_id",
      "name": "Professor Name",
      "email": "prof@college.edu",
      "specialization": "Machine Learning",
      "department": "Computer Science"
    }
  ],
  "rooms": [
    {
      "id": "unique_id",
      "number": "R101",
      "type": "Computer Lab",
      "building": "Main Building",
      "floor": "1st Floor",
      "capacity": 60,
      "equipment": "Computers, Projector"
    }
  ],
  "courses": ["BTech", "MTech", "BCA"],
  "departments": ["Computer Science", "Information Technology"],
  "semesters": ["Semester 1", "Semester 2", "..."],
  "roomTypes": ["Classroom", "Lab", "Auditorium"]
}
```

## 🎯 Advanced Algorithm Details

### 🔄 **Multi-Pass Randomized Scheduling**

The timetable generation uses a sophisticated constraint-satisfaction approach:

#### **Phase 1: Lab Scheduling**

- **Priority**: Labs scheduled first (more constraints)
- **Randomization**: Fisher-Yates shuffle for varied patterns
- **Consecutive Slots**: Books 2-4 hour blocks for labs
- **One Lab Per Day**: Strict rule - maximum one lab session daily
- **Room Preference**: Prioritizes lab-type rooms for lab sessions

#### **Phase 2: Lecture Scheduling**

- **Multi-Pass Approach**: Up to 3 attempts for optimal allocation
- **Daily Distribution**: Spreads lectures across different days
- **Conflict Prevention**: Avoids faculty and room double-booking
- **Back-to-Back Avoidance**: Prevents consecutive same-subject lectures
- **Randomized Slots**: Random slot selection for better distribution

#### **Constraint Rules**

```
✅ Faculty Availability: No double-booking of teachers
✅ Room Availability: No double-booking of rooms
✅ Daily Subject Limit: One activity per subject per day
✅ Lab Restrictions: One lab session per day maximum
✅ Consecutive Lab Slots: 2-4 hour blocks for lab sessions
✅ Time Slot Validation: All sessions within college hours
✅ Student Capacity: Rooms must accommodate student count
```

### 🎨 **UI/UX Features**

#### **Interactive Dashboard**

- **Real-time Statistics**: Animated counters for subjects/faculty/rooms
- **Card-based Design**: Clean, modern interface cards
- **Edit-in-Place**: Click edit button to modify any record
- **Toast Notifications**: Success/error feedback for all actions

#### **Form Intelligence**

- **Auto-Population**: Edit mode pre-fills all form fields
- **Validation**: Real-time input validation with error messages
- **Auto-Update**: Duplicate entries automatically update existing records
- **Cross-Reference**: Faculty selections sync across all forms

#### **Responsive Design**

- **Mobile-First**: Optimized for phones and tablets
- **Progressive Enhancement**: Works without JavaScript (basic functionality)
- **Loading States**: Visual feedback during operations
- **Error Handling**: Graceful degradation on failures

## 📁 Project Structure

```
📦 Time Table Generator/
├── 📄 server.js              # Express.js backend server
├── 📄 package.json           # Node.js dependencies & scripts
├── 📄 database.json          # Persistent data storage
├── 📄 index.html             # Main application interface
├── 📄 timetable.js           # Core logic (1600+ lines)
├── 📄 script.js              # UI interactions & statistics
├── 📄 style.css              # Responsive styling & animations
├── 📄 README.md              # This documentation
├── 📄 PROJECT_DOCUMENTATION.md # Technical documentation
├── 📁 node_modules/          # Installed dependencies
└── 📁 res/                   # SVG icons & assets
    ├── 🗑️ delete.svg         # Delete button icon
    ├── ✏️ edit.svg           # Edit button icon
    ├── 👨‍🏫 faculty.svg        # Faculty statistics icon
    ├── 📚 subject.svg         # Subject statistics icon
    └── 📅 timetable.svg       # Timetable statistics icon
```

## 🛠️ Development & Customization

### **Local Development**

```bash
# Install dependencies
npm install

# Start with auto-restart (recommended)
npm run dev

# Start production server
npm start
```

### **Adding New Features**

1. **Backend**: Add API endpoints in `server.js`
2. **Frontend Logic**: Extend functions in `timetable.js`
3. **UI Components**: Update interface in `index.html`
4. **Styling**: Modify appearance in `style.css`

### **Configuration Options**

- **Port**: Change `PORT` variable in `server.js`
- **Database**: Modify schema in `database.json`
- **Time Slots**: Adjust generation logic in `generateTimeSlots()`
- **Algorithm**: Tune constraints in `generateOptimizedSchedule()`

## 📡 API Reference

### **Authentication**

No authentication required (local development setup)

### **Base URL**

```
http://localhost:3000/api
```

### **Endpoints**

#### **Get All Data**

```http
GET /api/database
```

**Response**: Complete database object with all entities

#### **Subject Management**

```http
POST /api/subjects
Content-Type: application/json

{
  "name": "Applied Machine Learning",
  "code": "CS401",
  "course": "BTech",
  "department": "Computer Science",
  "semester": "Semester 7",
  "lectureHours": 3,
  "labHours": 4,
  "labDuration": 2,
  "totalHours": 7,
  "assignedFaculty": "Dr. Smith"
}
```

```http
PUT /api/subjects/:id
Content-Type: application/json

{
  "name": "Updated Subject Name",
  "labDuration": 3
}
```

```http
DELETE /api/subjects/:id
```

#### **Faculty Management**

```http
POST /api/faculty
Content-Type: application/json

{
  "name": "Dr. Sarah Johnson",
  "email": "sarah.johnson@college.edu",
  "specialization": "Artificial Intelligence",
  "department": "Computer Science"
}
```

```http
PUT /api/faculty/:id
DELETE /api/faculty/:id
```

#### **Room Management**

```http
POST /api/rooms
Content-Type: application/json

{
  "number": "CS-Lab-101",
  "type": "Computer Lab",
  "building": "Academic Block A",
  "floor": "Ground Floor",
  "capacity": 30,
  "equipment": "30 Computers, Projector, Whiteboard"
}
```

```http
PUT /api/rooms/:id
DELETE /api/rooms/:id
```

## ⚠️ Important Notes

### **Data Management**

- 🔄 **Auto-Save**: All changes immediately persist to `database.json`
- 🔒 **Unique Identifiers**: Subject codes, faculty emails, room numbers must be unique
- 📝 **Auto-Update**: Duplicate identifiers automatically update existing records
- 💾 **Backup Recommended**: Regularly backup your `database.json` file

### **Algorithm Limitations**

- 📊 **Complexity**: Very complex schedules may require manual adjustment
- ⏱️ **Time Constraints**: Requires sufficient time slots for all activities
- 🏢 **Room Capacity**: Rooms must accommodate specified student count
- 👥 **Faculty Load**: Each faculty can only teach one session at a time

### **Performance**

- 🚀 **Optimal**: Works best with 10-50 subjects per semester
- 💻 **Browser Support**: Modern browsers (Chrome 70+, Firefox 65+, Safari 12+)
- 📱 **Mobile**: Fully responsive on phones and tablets
- ⚡ **Speed**: Timetable generation typically takes 1-3 seconds

## 🐛 Troubleshooting

### **Common Issues**

#### **Port Already in Use**

```bash
Error: listen EADDRINUSE :::3000
```

**Solution**: Change port in `server.js` or kill existing process:

```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Kill process on port 3000 (Mac/Linux)
lsof -ti:3000 | xargs kill -9
```

#### **Database File Issues**

**Problem**: Corrupted or missing `database.json`  
**Solution**: Delete file and restart server to recreate:

```bash
rm database.json
npm start
```

#### **Timetable Generation Fails**

**Common Causes**:

- ❌ Insufficient time slots for required hours
- ❌ No rooms with adequate capacity
- ❌ Over-constrained lab schedules
- ❌ Faculty conflicts in data

**Solutions**:

- ✅ Increase college hours (longer time range)
- ✅ Add more rooms or increase room capacity
- ✅ Reduce lab hours or increase lab duration
- ✅ Check for duplicate faculty assignments

#### **UI Not Loading**

**Check**:

1. Server is running (`npm start` in terminal)
2. No JavaScript errors in browser console (F12)
3. Database file is accessible and valid JSON
4. All required files are present

#### **Statistics Showing Zero**

**Solution**: Refresh page or check `updateStatistics()` function calls

## 📄 License & Credits

**Author**: Tirth  
**Version**: 2.0 (Advanced Edition)  
**License**: MIT License  
**Node.js**: Backend server framework  
**Dependencies**: Express.js, CORS, Nodemon

---

## 🎉 Version History

### **v2.0 - Advanced Edition** _(Current)_

- ✨ Advanced randomized scheduling algorithm
- ✨ Real-time editing with auto-population
- ✨ Auto-update logic for duplicate entries
- ✨ Live statistics with animated counters
- ✨ Comprehensive constraint satisfaction
- ✨ Multi-pass scheduling with 3 attempts
- ✨ Lab session optimization (2-4 hour blocks)
- ✨ Mobile-responsive interface improvements

### **v1.0 - Basic Edition**

- 📝 Basic CRUD operations
- 🗂️ Simple timetable generation
- 💾 File-based data persistence
- 🌐 REST API with Node.js backend

---

**🚀 Ready to generate intelligent timetables? Run `npm start` and visit `http://localhost:3000`**
