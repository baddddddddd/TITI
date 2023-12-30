const express = require("express");
const db = require("../db");
const router = express.Router();

router.get("/:assignmentId", (req, res) => {
    let assignmentId = req.params.assignmentId;

    const query = `
    SELECT *
    FROM Assignments
    LEFT JOIN File ON Assignments.AttachmentID = File.FileID
    LEFT JOIN Courses ON Assignments.CourseID = Courses.CourseID
    WHERE Assignments.AssignmentID = ?;
`;
    const params = [assignmentId];
    
    db.query(query, params, (err, result) => {
        let assignment = result[0];

        console.log(assignment);

        const query = "SELECT * FROM Submissions JOIN File ON Submissions.FileID = File.FileID WHERE AssignmentID=? AND StudentID=?";
        const params = [assignmentId, req.session.userId];

        let isInstructor = req.session.userId == assignment.InstructorID;

        let info = {
            id: assignment.AssignmentID,
            title: assignment.AssignmentTitle,
            instructions: assignment.Instructions,
            dueDate: assignment.DueDate,
            uploadDate: assignment.UploadDate,
            fileName: assignment.FileName,
            fileId: assignment.FileID,
            filePath: assignment.FilePath,
        };

        if (!isInstructor) {

            db.query(query, params, (err, result) => {
                let submission = {};
                if (result.length == 0) {
                    submission.status = "Pending";
                } else {
                    submission.status = result[0].Status;
                    submission.fileName = result[0].FileName;
                    submission.filePath = result[0].FilePath;
                }

                info.submission = submission;
        
                res.render("assignment/view", { info: info, isInstructor: isInstructor, courseCode: assignment.CourseCode });
            });
        } else {
            const query = "SELECT * FROM Submissions JOIN UserProfile ON StudentID = UserID JOIN File ON Submissions.FileID = File.FileID WHERE AssignmentID=?";
            const params = [assignmentId];
            
            db.query(query, params, (err, result) => {
                let submissions = [];

                result.forEach((submission) => {
                    submissions.push({
                        name: `${submission.LastName}, ${submission.FirstName} ${submission.MiddleName} ${submission.NameExtension}`,
                        fileName: submission.FileName,
                        filePath: submission.FilePath,
                    });
                });

                res.render("assignment/view", { info: info, submissions: submissions, isInstructor: isInstructor, courseCode: assignment.CourseCode });
            });
        }
    });
});

module.exports = router;