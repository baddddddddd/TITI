const express = require("express");
const app = express();

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


app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + "/static"));

// Routes

app.get('/', (req, res) => {
    res.render("login.ejs", {errorMessage: '' });
});

app.post('/', authController.verifyUser);


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


// End Routes
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});