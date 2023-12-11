const express = require("express");
const session = require('express-session');
const app = express();

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
}));

const db = require('./db');
const registrationController = require('./controllers/registrationController');
const loginController = require('./controllers/loginController');
const authController = require("./controllers/authController");
const generator = require("./utils/generator");

const courseRouter = require("./routers/course");
const generateClassCode = require("./utils/generator");
app.use("/course", courseRouter);

const multer = require("multer");
// Set up multer to handle file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

const dashboardController = require("./controllers/dashboardController")

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + "/static"));

// Routes
// Login
app.get('/', (req, res) => {
    res.render("login.ejs", {errorMessage: '' });
});

app.post('/', authController.verifyUser);

// Student Dashboard
app.get('/dashboard', dashboardController.renderDashboard);


// Admin Dashboard
app.get('/admin', (req, res) => {
    res.render("admin.ejs", {errorMessage: '' });
});

app.post('/admin', authController.verifyAdmin);

// Registration
app.get('/register', (req, res) => {
    res.render("register.ejs", {registrationResult: '' });
});

app.post('/register', authController.registerUser);


// Student Dashboard
app.get('/dashboard', (req, res) => {
    res.render("dashboard.ejs");
});

// TK Course Router not working
app.post("/course/create", (req, res) => {
    // Create course endpoint
    let className = req.body.className;
    let classSection = req.body.classSection;
    let classSubject = req.body.classSubject;
    let classRoom = req.body.classRoom;
    let classCode = generateClassCode();

    let userId = req.session.userId;

    let query = "INSERT INTO Courses (InstructorID, CourseCode, ClassName, Section, Subject, Room) VALUES (?, ?, ?, ?, ?, ?)";
    let params = [userId, classCode, className, classSection, classSubject, classRoom]; 

    db.query(query, params, (req, result) => {
        res.redirect(`/course/${classCode}`);
    });
});

function formatMySQLDatetime(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function getCurrentDatetime() {
    // Get the current UTC time
    const utcNow = new Date();
    
    // Create a new DateTimeFormat object for the target timezone (GMT+8)
    const gmt8DateTimeFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore', // Adjust timezone accordingly
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
    });

    // Format the date in the GMT+8 timezone
    const gmt8DateString = gmt8DateTimeFormat.format(utcNow);

    // Convert the formatted string back to a Date object
    let gmt8Date = new Date(gmt8DateString);
    gmt8Date.setHours(gmt8Date.getHours() + 16);

    // Output the formatted MySQL datetime string
    const mysqlDatetimeString = formatMySQLDatetime(gmt8Date);

    return mysqlDatetimeString;
} 

app.post("/course/upload", upload.single("file"), (req, res) => {
    console.log(req.body);
    console.log(req.file);

    let courseCode = req.body.code;
    let fileName = req.body.fileName;

    let query = "INSERT INTO File (FileName, FilePath) VALUES (?, ?)";
    let params = [fileName, req.file.path];

    db.query(query, params, (err, result) => {
        let fileId = result.insertId;

        console.log(fileId);

        let query = "SELECT CourseID FROM Courses WHERE CourseCode=?";
        let params = [courseCode];

        console.log(query);
        console.log(params);

        db.query(query, params, (err, result) => {
            let courseId = result[0].CourseID;

            let query = "INSERT INTO CourseMaterials (CourseID, FileID, UploadDate) VALUES (?, ?, ?)";
            let params = [courseId, fileId, getCurrentDatetime()];

            db.query(query, params, (err, result) => {
                console.log(result);

                res.redirect(`/course/${courseCode}`);
            });
        });
    });
});

app.post("/course/join", (req, res) => {
    const userId = req.session.userId;
    const courseCode = req.body.courseCode;

    const query = "SELECT * FROM Courses WHERE CourseCode=?";
    const params = [courseCode];

    db.query(query, params, (err, result) => {
        if (result.length == 0) {
            res.render("course/join", { errorMessage: "Course does not exist." });
            return;
        }

        const course = result[0];
        const courseID = course.CourseID;

        const query = "INSERT INTO CourseEnrolees (CourseID, StudentID) VALUES (?, ?)";
        const params = [courseID, userId];

        db.query(query, params, (err, result) => {
            console.log(result);
            res.redirect(`${courseCode}`);
        });
    });
});

app.post("/course/download", (req, res) => {
    console.log(req.body);

    let path = req.body.path;

    res.download(path);
});

app.post("/course/announce", (req, res) => {
    console.log(req.body);

    let userId = req.session.userId;
    let content = req.body.announcementContent;
    let courseId = req.body.courseId;

    const query = "INSERT INTO Announcements (AnnouncerID, CourseID, Content, AnnouncementDate) VALUES (?, ?, ?, ?)";
    const params = [userId, courseId, content, getCurrentDatetime()];

    db.query(query, params, (err, result) => {
        res.redirect(`/course/${req.body.courseCode}`);
    });
});

app.post("/course/assignment/create", (req, res) => {
    let courseId = req.body.courseId;
    let courseCode = req.body.courseCode;

    res.render("assignment/create", { courseId: courseId, courseCode: courseCode });
});

app.post("/course/assignment/create/submit", upload.single("file"), (req, res) => {
    const title = req.body.title;
    const instructions = req.body.instructions;
    const date = req.body.date;
    const time = req.body.time;
    const duedate = `${date} ${time}`
    const courseId = req.body.courseId;
    const courseCode = req.body.courseCode;
    const uploadDate = getCurrentDatetime();

    let query = "INSERT INTO File (FileName, FilePath) VALUES (?, ?)";
    let params = [req.file.filename, req.file.path];
    
    db.query(query, params, (err, result) => {
        const fileId = result.insertId;

        const query = "INSERT INTO Assignments (AssignmentTitle, Instructions, DueDate, CourseID, AttachmentID, UploadDate) VALUES (?, ?, ?, ?, ?, ?)";
        const params = [title, instructions, duedate, courseId, fileId, uploadDate];

        db.query(query, params, (err, result) => {
            console.log(result);

            res.redirect(`/course/${courseCode}`);
        });
    });
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/'); // Redirect to the login page after logout
    });
})

// End Routes
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});