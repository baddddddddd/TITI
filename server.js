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
        cb(null, Date.now() + '-' +file.originalname);
    }
});

const upload = multer({ storage: storage });

const dashboardController = require("./controllers/dashboardController");
const { render } = require("ejs");

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + "/static"));

// Routes
// Student Login
app.get('/', (req, res) => {
    res.render("login.ejs", {errorMessage: '' });
});

app.post('/', authController.verifyUser);

// Admin Dashboard
app.get('/admin', (req, res) => {
    res.render("admin.ejs", {errorMessage: '' });
});

app.post('/admin', authController.verifyAdmin);

app.get('/admin/dashboard', adminController.renderAdminDashboard);

// Admin Registration
app.get('/admin/dashboard/register', (req, res) => {
    res.render("register.ejs", {registrationResult: '' });
});

app.post('/admin/dashboard/register', authController.registerUser);

// Account Deletion
app.get('/admin/dashboard/delete-account', (req, res) => {
    if (!req.session || !req.session.adminID) {
        return res.render("admin.ejs", { errorMessage: "Login your account first." });
    }

    return res.render("admin/deleteAccount.ejs", { user: {}, status: '' });
});

app.get('/admin/dashboard/show-account', (req, res) => {
    if (!req.session || !req.session.adminID) {
        return res.render("admin.ejs", { errorMessage: "Login your account first." });
    }

    return res.render("admin/deleteAccount.ejs", { user: {}, status: '' });
});

app.post('/admin/dashboard/show-account', (req, res) => {
    const userCode = req.body.userCode;

    const userCredentialsQuery = "SELECT UserID FROM UserCredentials WHERE UserCode = ?";
    db.query(userCredentialsQuery, [userCode], (error, userCredentialsResult) => {
        if (error) {
            console.error("Error executing query:", error);
            return res.render("admin/deleteAccount.ejs", { user: {}, status: 'Error retrieving user details.' });
        }

        if (userCredentialsResult.length > 0) {
            const userID = userCredentialsResult[0].UserID;

            const userProfileQuery = "SELECT UI.FirstName, UI.MiddleName, UI.LastName, SI.Section " +
                "FROM UserProfile UI " +
                "LEFT JOIN StudentInformation SI ON UI.UserID = SI.UserID " +
                "WHERE UI.UserID = ?";
            db.query(userProfileQuery, [userID], (error, userProfileResult) => {
                if (error) {
                    console.error("Error executing query:", error);
                    return res.render("admin/deleteAccount.ejs", { user: {}, status: 'Error retrieving user details.' });
                }

                if (userProfileResult.length > 0) {
                    const user = userProfileResult[0];
                    return res.render("admin/deleteAccount.ejs", { user, status: 'Account found.' });
                } else {
                    return res.render("admin/deleteAccount.ejs", { user: {}, status: 'User not found.' });
                }
            });
        } else {
            return res.render("admin/deleteAccount.ejs", { user: {}, status: 'User not found.' });
        }
    });
});

app.post('/admin/dashboard/delete-account', (req, res) => {
    const userCode = req.body.userCode;
    let status = '';

    const userCredentialsQuery = "SELECT UserID FROM UserCredentials WHERE UserCode = ?";
    db.query(userCredentialsQuery, [userCode], (error, userCredentialsResult) => {
        if (error) {
            console.error(error);
            status = "Error finding user.";
            return res.render("admin/deleteAccount.ejs", { user: {}, status });
        }

        if (userCredentialsResult.length > 0) {
            const userID = userCredentialsResult[0].UserID;

            const deleteQuery1 = "DELETE FROM StudentInformation WHERE UserID = ?";
            const deleteQuery2 = "DELETE FROM UserCredentials WHERE UserID = ?";
            const deleteQuery3 = "DELETE FROM UserProfile WHERE UserID = ?";
            const deleteQuery6 = "DELETE FROM Courses WHERE InstructorID = ?";

            db.query(deleteQuery1, [userID], (error1) => {
                if (error1) {
                    console.error(error1);
                    status = "Error deleting user account.";
                    return res.render("admin/deleteAccount.ejs", { user: {}, status });
                }

                db.query(deleteQuery2, [userID], (error2) => {
                    if (error2) {
                        console.error(error2);
                        status = "Error deleting user account.";
                        return res.render("admin/deleteAccount.ejs", { user: {}, status });
                    }

                    db.query(deleteQuery3, [userID], (error3) => {
                        if (error3) {
                            console.error(error3);
                            status = "Error deleting user account.";
                            return res.render("admin/deleteAccount.ejs", { user: {}, status });
                        }

                        // Add your additional delete query here
                        db.query(deleteQuery6, [userID], (error6) => {
                            if (error6) {
                                console.error(error6);
                                status = "Error deleting user account.";
                                return res.render("admin/deleteAccount.ejs", { user: {}, status });
                            }
                        
                            status = "User account deleted successfully.";
                            res.render("admin/deleteAccount.ejs", { user: {}, status });
                        });
                    });
                });
            });
        } else {
            status = "User not found.";
            res.render("admin/deleteAccount.ejs", { user: {}, status });
        }
    });
});

// Admin Feedback
app.get('/admin/dashboard/feedback', adminController.renderFeedback);
app.post('/delete-feedback', (req, res) => {
    const feedbackID = req.body.feedbackID;

    if (!feedbackID) {
        return res.status(400).send("FeedbackID is required for deletion.");
    }

    db.query('DELETE FROM Feedback WHERE FeedbackID = ?', [feedbackID], (error, results) => {
        if (error) {
            console.error("Error deleting feedback:", error);
            return res.status(500).send("Internal Server Error");
        }

        console.log("Feedback deleted successfully.");
        res.redirect('/admin/dashboard/feedback');
    });
});

function renderSchedule(req, res, status, deleteStatus) {
    const query = 'SELECT SubjectCode, SubjectName, Instructor FROM Subject';

    db.query(query, (error, results, fields) => {
        res.render('admin/createSchedule.ejs', { status: "", deleteStatus, subjects: results });
    });
}

// Admin Create Schedule
app.get('/admin/dashboard/create-schedule', (req, res) => {
    if (!req.session || !req.session.adminID) {
        return res.render("admin.ejs", { errorMessage: "Login your account first." });
    }
    
    renderSchedule(req, res);
});

app.get('/admin/dashboard/insert-schedule', (req, res) => {
    if (!req.session || !req.session.adminID) {
        return res.render("admin.ejs", { errorMessage: "Login your account first." });
    }

    renderSchedule(req, res);
});

// let responseSent = false;
// app.post('/admin/dashboard/insert-schedule', (req, res) => {
//     const timeSlots = req.body.time_slot;

//     if (!timeSlots || !Array.isArray(timeSlots)) {
//         return res.status(400).send("Invalid request format");
//     }

//     const checkSubjectsExistence = () => {
//         const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

//         for (const day of weekdays) {
//             const subjectCode = req.body[day];

//             // Replace 'Subject' with the actual name of your Subject table
//             const subjectQuery = 'SELECT COUNT(*) AS count FROM Subject WHERE SubjectCode = ?';

//             db.query(subjectQuery, [subjectCode], (error, results) => {
//                 if (error) {
//                     console.error(error);
//                     if (!responseSent) {
//                         responseSent = true;
//                         return res.status(500).send("Internal Server Error");
//                     }
//                 }

//                 const count = results[0].count;

//                 if (count === 0) {
//                     if (!responseSent) {
//                         responseSent = true;
//                         return res.render('admin/createSchedule.ejs', {
//                             status: "Failed. Subject not found.",
//                             deleteStatus: "",
//                             subjects: [] // You may want to fetch and pass the subjects here for rendering
//                         });
//                     }
//                 }

//                 // Proceed to insert schedules if all subjects are found
//                 if (day === 'Friday' && !responseSent) {
//                     insertSchedules();
//                 }
//             });
//         }
//     };

//     const insertSchedules = () => {
//         const sql = 'INSERT INTO ClassSchedule (Section, time_slot, Monday, Tuesday, Wednesday, Thursday, Friday) VALUES (?, ?, ?, ?, ?, ?, ?)';
//         const schedules = timeSlots.map((_, index) => ({
//             Section: req.body.Section[index],
//             time_slot: req.body.time_slot[index],
//             Monday: req.body.Monday[index],
//             Tuesday: req.body.Tuesday[index],
//             Wednesday: req.body.Wednesday[index],
//             Thursday: req.body.Thursday[index],
//             Friday: req.body.Friday[index],
//         }));

//         schedules.forEach((schedule, index) => {
//             const values = [
//                 schedule.Section,
//                 schedule.time_slot,
//                 schedule.Monday,
//                 schedule.Tuesday,
//                 schedule.Wednesday,
//                 schedule.Thursday,
//                 schedule.Friday,
//             ];

//             db.query(sql, values, (err, result) => {
//                 if (err) {
//                     console.error(err);
//                     const query = 'SELECT SubjectCode, SubjectName, Instructor FROM Subject';

//                     db.query(query, (error, results, fields) => {
//                         if (!responseSent) {
//                             responseSent = true;
//                             return res.render('admin/createSchedule.ejs', {
//                                 status: "Failed. Please follow the instruction above.",
//                                 deleteStatus: "",
//                                 subjects: results
//                             });
//                         }
//                     });
//                 }

//                 if (index === schedules.length - 1 && !responseSent) {
//                     const query = 'SELECT SubjectCode, SubjectName, Instructor FROM Subject';

//                     db.query(query, (error, results, fields) => {
//                         if (!responseSent) {
//                             responseSent = true;
//                             return res.render('admin/createSchedule.ejs', {
//                                 status: "Successful",
//                                 deleteStatus: "",
//                                 subjects: results
//                             });
//                         }
//                     });
//                 }
//             });
//         });
//     };

//     // Check subjects existence before proceeding to insert schedules
//     checkSubjectsExistence();
// });

const validSubjects = [
    'BE01', 'BF01', 'BT01', 'CEN01', 'CEN02', 'CEN03', 'CEN04', 'CEN05',
    'CPAR01', 'DIASS01', 'DIASS02', 'DIASS03', 'DRRR01', 'EAPP01', 'EAPP02',
    'ETP01', 'ETP02', 'FABM01', 'FIL01', 'FIL02', 'GC01', 'GP01', 'HOPE01',
    'HOPE02', 'LB01', 'NONE', 'PD01', 'PD02', 'PD03', 'POL01', 'PR01', 'PR02',
    'PR03', 'TN01', 'TN02', 'UCSP01', 'UCSP02', 'UCSP03', 'SEC01', 'SEC02', 'SEC03',
    'SEC04', 'SEC05', 'SEC06', 'SEC07', 'SEC08', 'SEC09', 'SEC10', 'SEC11', 'SEC12', 'SEC13'
];

app.post('/admin/dashboard/insert-schedule', (req, res) => {
    const timeSlots = req.body.time_slot;

    if (!timeSlots || !Array.isArray(timeSlots)) {
        return res.status(400).send("Invalid request format");
    }

    // Function to check if a subject is valid
    const isValidSubject = (subject) => validSubjects.includes(subject);

    const sql = 'INSERT INTO ClassSchedule (Section, time_slot, Monday, Tuesday, Wednesday, Thursday, Friday) VALUES (?, ?, ?, ?, ?, ?, ?)';

    const schedules = timeSlots.map((_, index) => ({
        Section: req.body.Section[index],
        time_slot: req.body.time_slot[index],
        Monday: req.body.Monday[index],
        Tuesday: req.body.Tuesday[index],
        Wednesday: req.body.Wednesday[index],
        Thursday: req.body.Thursday[index],
        Friday: req.body.Friday[index],
    }));

    // Check if all subjects are valid
    if (schedules.some(schedule => !isValidSubject(schedule.Monday) || !isValidSubject(schedule.Tuesday) || !isValidSubject(schedule.Wednesday) || !isValidSubject(schedule.Thursday) || !isValidSubject(schedule.Friday))) {
        return res.render('admin/createSchedule.ejs', { status: "Failed. Invalid subjects. Please follow the instruction above.", deleteStatus: "", subjects: validSubjects });
    }

    schedules.forEach((schedule, index) => {
        const values = [
            schedule.Section,
            schedule.time_slot,
            schedule.Monday,
            schedule.Tuesday,
            schedule.Wednesday,
            schedule.Thursday,
            schedule.Friday,
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error(err);
                const query = 'SELECT SubjectCode, SubjectName, Instructor FROM Subject';

                db.query(query, (error, results, fields) => {
                    return res.render('admin/createSchedule.ejs', { status: "Failed. Please follow the instruction above.", deleteStatus: "", subjects: results });
                });
            }

            if (index === schedules.length - 1) {
                const query = 'SELECT SubjectCode, SubjectName, Instructor FROM Subject';

                db.query(query, (error, results, fields) => {
                    return res.render('admin/createSchedule.ejs', { status: "Successful", deleteStatus: "", subjects: results });
                });
            }
        });
    });
});

app.get('/admin/dashboard/delete-schedule', (req, res) => {
    renderSchedule(req, res);
})
app.post('/admin/dashboard/delete-schedule', (req, res) => {
    const Section = req.body.Section;

    db.query('DELETE FROM ClassSchedule WHERE Section = ?', [Section], (error, results) => {
        if (error) {
            renderSchedule(req, res, "", "Failed");
            return;
        }

        if (results.affectedRows === 0) {
            renderSchedule(req, res, "", "Section not found.");
            return;
        }

        const deleteStatus = "Successful";
        console.log("Schedule deleted successfully.");
        renderSchedule(req, res, "", "Successful");
    });
});

app.get('/admin/dashboard/show-schedule', (req, res) => {
    if (!req.session || !req.session.adminID) {
      return res.render("admin.ejs", { errorMessage: "Login your account first." });
    }

    const query_sub = 'SELECT SubjectCode, SubjectName, Instructor FROM Subject';

    db.query(query_sub, (error, results, fields) => {

        const query = 'SELECT * FROM ClassSchedule';
  
        db.query(query, (err, schedules) => {
        if (err) {
            console.error('Error fetching schedules:', err);
            return res.status(500).send("Internal Server Error");
        }
    
        return res.render("admin/showSchedule.ejs", { schedules, subjects: results});
        });
    });
});

// Admin Appointment
app.get('/admin/dashboard/appointments', adminController.renderAppointments);
app.post('/handle-appointment', adminController.handleAppointment);

// Modify the route for deleting feedback
app.post('/delete-appointment', (req, res) => {
    const appointmentID = req.body.appointmentID;

    if (!appointmentID) {
        return res.status(400).send("AppointmentID is required for deletion.");
    }

    // Instead of deleting, you might want to update the status to 'canceled' or similar
    db.query('UPDATE Appointments SET Status = "canceled" WHERE AppointmentID = ?', [appointmentID], (error, results) => {
        if (error) {
            console.error("Error updating appointment status:", error);
            return res.status(500).send("Internal Server Error");
        }

        console.log("Appointment canceled successfully.");
        res.redirect('/admin/dashboard/appointments');
    });
});

// // Student Dashboard
// app.get('/dashboard', (req, res) => {
//     res.render("dashboard.ejs");
// });

// Student Dashboard
app.get('/dashboard', dashboardController.renderDashboard);

// Schedule
app.get('/dashboard/schedule', dashboardController.renderSchedule);

// Student Drawing Board
app.get('/dashboard/drawingboard', dashboardController.renderDrawingBoard);

// Student Appointment
app.get('/dashboard/appointment', dashboardController.getAppointment);
app.post('/dashboard/appointment', dashboardController.postAppointment);

// Student Feedback
app.get('/dashboard/feedback', (req, res) => {
    res.render("student/feedback.ejs", {insertingStatus: '' });
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

app.post('/dashboard/course/delete-course', (req, res) => {
    const { courseInput } = req.body;
  
    // Step 1: Find CourseID using CourseCode
    const findCourseIdQuery = 'SELECT CourseID FROM Courses WHERE CourseCode = ?';
  
    db.query(findCourseIdQuery, [courseInput], (error, results) => {
      if (error) {
        console.error('Error finding CourseID:', error);
        res.status(500).send('Error finding CourseID');
        return;
      }
  
      if (results.length === 0) {
        // Course with the given CourseCode not found
        res.status(404).send('Course not found');
        return;
      }
  
      const courseId = results[0].CourseID;
  
      // Step 3: Delete records from CourseEnrolees where CourseID matches
      const deleteEnroleesQuery = 'DELETE FROM CourseEnrolees WHERE CourseID = ?';
  
      db.query(deleteEnroleesQuery, [courseId], (enroleesError) => {
        if (enroleesError) {
          console.error('Error deleting enrolees:', enroleesError);
          res.status(500).send('Error deleting enrolees');
          return;
        }
  
        // Step 4: Delete Announcements with the corresponding CourseID
        const deleteAnnouncementsQuery = 'DELETE FROM Announcements WHERE CourseID = ?';
  
        db.query(deleteAnnouncementsQuery, [courseId], (announcementsError) => {
          if (announcementsError) {
            console.error('Error deleting announcements:', announcementsError);
            res.status(500).send('Error deleting announcements');
            return;
          }
  
          // Step 5: Delete Course Materials with the corresponding CourseID
          const deleteCourseMaterialsQuery = 'DELETE FROM CourseMaterials WHERE CourseID = ?';
  
          db.query(deleteCourseMaterialsQuery, [courseId], (courseMaterialsError) => {
            if (courseMaterialsError) {
              console.error('Error deleting course materials:', courseMaterialsError);
              res.status(500).send('Error deleting course materials');
              return;
            }
  
            // Step 6: Delete Assignments with the corresponding CourseID
            const deleteAssignmentsQuery = 'DELETE FROM Assignments WHERE CourseID = ?';
  
            db.query(deleteAssignmentsQuery, [courseId], (assignmentsError) => {
              if (assignmentsError) {
                console.error('Error deleting assignments:', assignmentsError);
                res.status(500).send('Error deleting assignments');
                return;
              }
  
              // Step 7: Delete Course from Courses table
              const deleteCourseQuery = 'DELETE FROM Courses WHERE CourseCode = ?';
  
              db.query(deleteCourseQuery, [courseInput], (deleteError) => {
                if (deleteError) {
                  console.error('Error deleting course:', deleteError);
                  res.status(500).send('Error deleting course');
                  return;
                }
                  res.redirect('/dashboard');
              });
            });
          });
        });
      });
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
    let duedate = (date) ? `${date} ${time}` : null;
    const courseId = req.body.courseId;
    const courseCode = req.body.courseCode;
    const uploadDate = getCurrentDatetime();

    if (duedate) {
        let dateObj = new Date(duedate);
        dateObj.setHours(dateObj.getHours() + 16);
        duedate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
    }

    function insertAssignment(fileId = null) {
        const query = "INSERT INTO Assignments (AssignmentTitle, Instructions, DueDate, CourseID, AttachmentID, UploadDate) VALUES (?, ?, ?, ?, ?, ?)";
        const params = [title, instructions, duedate, courseId, fileId, uploadDate];

        db.query(query, params, (err, result) => {
            console.log(result);

            res.redirect(`/course/${courseCode}`);
        });
    }

    function insertFile() {
        let query = "INSERT INTO File (FileName, FilePath) VALUES (?, ?)";
        let params = [req.file.filename, req.file.path];
        
        db.query(query, params, (err, result) => {
            let fileId = result.insertId;
            insertAssignment(fileId);
        });
    }

    console.log(req.file);

    if (req.file) {
        insertFile();
    } else {
        insertAssignment();
    }
});

app.post("/course/assignment/upload", upload.single("file"), (req, res) => {
    const assignmentId = req.body.assignmentId;
    const studentId = req.session.userId;

    const type = req.body.type;

    if (type == "unsubmit") {
        const query = "DELETE FROM Submissions WHERE AssignmentID=? AND StudentID=?";
        const params = [assignmentId, studentId];

        db.query(query, params, (err, result) => {
            console.log(result);
            res.redirect(`/course/assignment/${assignmentId}`);
        });
        
    } else if (type == "submit") {
        function submitAssignment(fileId = null) {
            const query = "INSERT INTO Submissions (FileID, AssignmentID, StudentID, Status) VALUES (?, ?, ?, ?)";
            const params = [fileId, assignmentId, studentId, "Turned In"];
    
            console.log(query);
            console.log(params);
    
            db.query(query, params, (err, result) => {
                console.log(result);
    
                res.redirect(`/course/assignment/${assignmentId}`);
            });
        }
    
        function insertFile() {
            let query = "INSERT INTO File (FileName, FilePath) VALUES (?, ?)";
            let params = [req.file.filename, req.file.path];
            
            db.query(query, params, (err, result) => {
                let fileId = result.insertId;
                submitAssignment(fileId);
            });
        }
    
        if (req.file) {
            insertFile();
        } else {
            submitAssignment();
        }
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/'); // Redirect to the login page after logout
    });
})

app.get('/admin/logout', (req, res) => {
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