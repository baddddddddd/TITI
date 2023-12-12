const express = require("express");
const db = require("../db");
const router = express.Router();

router.get("/:assignmentId", (req, res) => {
    let assignmentId = req.params.assignmentId;

    const query = "SELECT * FROM Assignments JOIN File ON AttachmentID = FileID WHERE AssignmentID = ?";
    const params = [assignmentId];
    
    db.query(query, params, (err, result) => {
        let assignment = result[0];

        const query = "SELECT * FROM Submissions JOIN File ON Submissions.FileID = File.FileID WHERE AssignmentID=? AND StudentID=?";
        const params = [assignmentId, req.session.userId];

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
    
            res.render("assignment/view", { info: info });
        });
    });
});

module.exports = router;
