const express = require("express");
const db = require("../db");
const router = express.Router();


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

        db.query("SELECT CourseID FROM Courses WHERE CourseCode=?", [req.params.courseId], (err, result) => {
            let courseID = result[0].CourseID;

            let query = "SELECT * FROM CourseMaterials NATURAL JOIN File WHERE CourseID=?";
            let params = [courseID];

            db.query(query, params, (err, result) => {
                let stream = [];

                result.forEach((item) => {
                    stream.push({
                        name: item.FileName,
                        path: item.FilePath,
                    });
                });

                res.render("course/overview", { name: name, subject: subject, section: section, room: room, code: req.params.courseId, stream: stream });
            });
        });
    });
});


module.exports = router;