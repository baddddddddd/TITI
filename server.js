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
const adminController = require("./controllers/adminController")
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

// Schedule
app.get('/dashboard/schedule', dashboardController.renderSchedule);

// Admin Dashboard
app.get('/admin', (req, res) => {
    res.render("admin.ejs", {errorMessage: '' });
});

app.post('/admin', authController.verifyAdmin);

app.get('/admin/dashboard', adminController.renderAdminDashboard);

// Registration
app.get('/admin/dashboard/register', (req, res) => {
    res.render("register.ejs", {registrationResult: '' });
});

app.post('/admin/dashboard/register', authController.registerUser);

// Student Dashboard
app.get('/dashboard', (req, res) => {
    res.render("dashboard.ejs");
});

// Drawing Board
app.get('/dashboard/drawingboard', dashboardController.renderDrawingBoard);

// Appointment
app.get('/dashboard/appointment', dashboardController.renderAppointment)
app.post('/dashboard/appointment', dashboardController.renderAppointment);

// Feedback
app.get('/dashboard/feedback', (req, res) => {
    res.render("feedback.ejs", {insertingStatus: '' });
});
app.post('/dashboard/feedback', dashboardController.renderFeedback);

// TK Course Router not working
app.post("/course/create", (req, res) => {
    // Create course endpoint
    let className = req.body.className;
    let classSection = req.body.classSection;
    let classSubject = req.body.classSubject;
    let classRoom = req.body.classRoom;
    let classCode = generateClassCode();

    // TK id
    let userId = 39;

    let query = "INSERT INTO Courses (InstructorID, CourseCode, ClassName, Section, Subject, Room) VALUES (?, ?, ?, ?, ?, ?)";
    let params = [userId, classCode, className, classSection, classSubject, classRoom]; 

    db.query(query, params, (req, result) => {
        res.redirect(`/course/${classCode}`);
    });
});

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
            console.log(result);
            let courseId = result[0].CourseID;

            console.log(courseId);

            let query = "INSERT INTO CourseMaterials (CourseID, FileID) VALUES (?, ?)";
            let params = [courseId, fileId];

            db.query(query, params, (err, result) => {
                console.log(result);

                res.redirect(`/course/${courseCode}`);
            });
        });
    });
});

app.post("/course/download", (req, res) => {
    console.log(req.body);

    let path = req.body.path;

    res.download(path);
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

app.post('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/admin'); // Redirect to the login page after logout
    });
})

// End Routes
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});