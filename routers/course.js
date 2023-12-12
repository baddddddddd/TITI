const express = require("express");
const db = require("../db");
const router = express.Router();

const assignmentRouter = require("./assignment");
router.use("/assignment", assignmentRouter);


router.get("/", (req, res) => {
    // View Courses
    const userId = req.session.userId;
    
    const query = "SELECT CourseID, CourseCode, ClassName, Section, FirstName, MiddleName, LastName FROM Courses JOIN UserProfile ON Courses.InstructorID = UserProfile.UserID NATURAL JOIN CourseEnrolees WHERE StudentID=?";
    const params = [userId];

    db.query(query, params, (err, result) => {
        let courses = [];
        
        result.forEach((course) => {
            courses.push({
                courseCode: course.CourseCode,
                courseName: course.ClassName,
                section: course.Section,
                instructor: `${course.LastName}, ${course.FirstName} ${course.MiddleName}`,
            });
        });

        res.render("course", { heading: "Enrolled Courses", courses: courses, isInstructor: false });
    });
});

router.get("/owned", (req, res) => {
    // View Courses
    const userId = req.session.userId;
    
    const query = "SELECT * FROM Courses JOIN UserProfile ON Courses.InstructorID = UserProfile.UserID WHERE InstructorID=?";
    const params = [userId];

    db.query(query, params, (err, result) => {
        let courses = [];
        
        result.forEach((course) => {
            courses.push({
                courseCode: course.CourseCode,
                courseName: course.ClassName,
                section: course.Section,
                instructor: `${course.LastName}, ${course.FirstName} ${course.MiddleName}`,
            });
        });

        res.render("course", { heading: "Owned Courses", courses: courses, isInstructor: true });
    });
});

router.get("/owned", (req, res) => {
    // View Courses
    const userId = req.session.userId;
    
    const query = "SELECT * FROM Courses JOIN UserProfile ON Courses.InstructorID = UserProfile.UserID WHERE InstructorID=?";
    const params = [userId];

    db.query(query, params, (err, result) => {
        let courses = [];
        
        result.forEach((course) => {
            courses.push({
                courseCode: course.CourseCode,
                courseName: course.ClassName,
                section: course.Section,
                instructor: `${course.LastName}, ${course.FirstName} ${course.MiddleName}`,
            });
        });

        res.render("course", { courses: courses });
    });
});

router.get("/create", (req, res) => {
    // Create courses, for teachers only
    res.render("course/create");
});



router.get("/join", (req, res) => {
    // Join courses, for students only
    res.render("course/join");
});

router.get("/:courseId", (req, res) => {
    // View a course through ID
    let query = "SELECT * FROM Courses WHERE CourseCode=?";
    let params = [req.params.courseId];

    db.query(query, params, (error, result) => {
        if (result.length == 0) {
            res.status(404);
            return;
        }

        let course = result[0];
        let name = course.ClassName;
        let subject = course.Subject;
        let section = course.Section;
        let room = course.Room;
        let instructorId = course.InstructorID;
        let courseId = course.CourseID;

        let isInstructor = instructorId == req.session.userId;

        db.query("SELECT CourseID FROM Courses WHERE CourseCode=?", [req.params.courseId], (err, result) => {
            let courseID = result[0].CourseID;

            let query = "SELECT * FROM CourseMaterials NATURAL JOIN File WHERE CourseID=?";
            let params = [courseID];

            db.query(query, params, (err, result) => {
                let materials = [];

                result.forEach((item) => {
                    materials.push({
                        type: "material",
                        name: item.FileName,
                        path: item.FilePath,
                        date: item.UploadDate,
                    });
                });

                const query = "SELECT FirstName, MiddleName, LastName, Content, AnnouncementDate FROM Announcements JOIN UserProfile ON AnnouncerID = UserID WHERE CourseID=?";
                const params = [courseID];

                db.query(query, params, (err, result) => {
                    let announcements = [];

                    result.forEach((announcement) => {
                        console.log(announcement.AnnouncementDate);
                        announcements.push({
                            type: "announcement",
                            announcer: `${announcement.LastName}, ${announcement.FirstName} ${announcement.MiddleName}`,
                            date: announcement.AnnouncementDate,
                            content: announcement.Content,
                        });
                    });

                    const query = "SELECT * FROM Assignments WHERE CourseID=?";
                    const params = [courseID];

                    db.query(query, params, (err, result) => {
                        let assignments = [];

                        result.forEach((assignment) => {
                            assignments.push({
                                type: "activity",
                                title: assignment.AssignmentTitle,
                                date: assignment.UploadDate,
                                dueDate: assignment.DueDate,
                                id: assignment.AssignmentID,
                            });
                        }); 

                        let streams = [...announcements, ...materials, ...assignments];
                        streams.sort((a, b) => b.date - a.date);
    
                        res.render("course/overview", { courseId: courseId, isInstructor: isInstructor, name: name, subject: subject, section: section, room: room, code: req.params.courseId, stream: streams });    
                    })
                });
            });
        });
    });
});

module.exports = router;