const db = require("../db");

exports.renderDashboard = (req, res) => {
    console.log("Session:", req.session); // Log the session object

    if (!req.session || !req.session.userCode) {
        return res.render("login.ejs", { errorMessage: "Login your account first." });
    }

    const userCode = req.session.userCode;
    const getUserIdQuery = "SELECT * FROM UserCredentials WHERE userCode = ?";

    db.query(getUserIdQuery, [userCode], (err, userIdResults) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send('Internal Server Error');
        }

        if (userIdResults.length > 0) {
            const userId = userIdResults[0].UserID;
            const isInstructor = userIdResults[0].AccountType == "Instructor";

            const query = "SELECT * FROM UserCredentials UC " +
                "LEFT JOIN UserProfile UP ON UC.UserID = UP.UserID " +
                "LEFT JOIN StudentInformation SI ON UC.UserID = SI.UserID " +
                "WHERE UC.UserID = ?;";

            db.query(query, [userId], (err, results) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).send('Internal Server Error');
                }

                if (results.length > 0) {
                    const firstName = results[0].FirstName;
                    const lastName = results[0].LastName;
                    const middleName = results[0].MiddleName;
                    const extensionName = results[0].ExtensionName;
                    const strand = results[0].Strand;
                    const section = results[0].Section;
                    const enrollmentStatus = results[0].EnrollmentStatus;

                    res.render("student/dashboard.ejs", {
                        userCode: userCode,
                        firstName: firstName,
                        lastName: lastName,
                        middleName: middleName,
                        extensionName: extensionName,
                        strand: strand,
                        section: section,
                        enrollmentStatus: enrollmentStatus,
                        isInstructor: isInstructor,
                    });
                } else {
                    res.render("login.ejs", { errorMessage: "Login your account first." });
                }
            });
        } else {
            res.render("login.ejs", { errorMessage: "Invalid userCode." });
        }
    });
};

exports.renderSchedule = (req, res) => {
    if (!req.session || !req.session.userCode) {
        return res.render("login.ejs", { errorMessage: "Login your account first." });
    }

    const userCode = req.session.userCode;

    db.query('SELECT UserID FROM UserCredentials WHERE UserCode = ?', [userCode], (error, userCredentialsResults) => {
        if (error) throw error;

        if (userCredentialsResults.length === 0 || !userCredentialsResults[0].UserID) {
            return res.render("login.ejs", { errorMessage: "Error proccessing request. Contact an admin." });
        }

        const userID = userCredentialsResults[0].UserID;

        db.query('SELECT Section FROM StudentInformation WHERE UserID = ?', [userID], (error, studentInfoResults) => {
            if (error) throw error;

            if (studentInfoResults.length === 0 || !studentInfoResults[0].Section) {  
                return res.render("login.ejs", { errorMessage: "Error proccessing request. Contact an admin." });
            }

            const section = studentInfoResults[0].Section; // Define section here

            const queryJoin = `
                    SELECT 
                    cs.time_slot,
                    s1.SubjectName AS SubjectMonday, 
                    s1.Instructor AS InstructorMonday,
                    s2.SubjectName AS SubjectTuesday, 
                    s2.Instructor AS InstructorTuesday,
                    s3.SubjectName AS SubjectWednesday, 
                    s3.Instructor AS InstructorWednesday,
                    s4.SubjectName AS SubjectThursday, 
                    s4.Instructor AS InstructorThursday,
                    s5.SubjectName AS SubjectFriday, 
                    s5.Instructor AS InstructorFriday
                FROM ClassSchedule cs
                LEFT JOIN Subject s1 ON cs.Monday = s1.SubjectCode
                LEFT JOIN Subject s2 ON cs.Tuesday = s2.SubjectCode
                LEFT JOIN Subject s3 ON cs.Wednesday = s3.SubjectCode
                LEFT JOIN Subject s4 ON cs.Thursday = s4.SubjectCode
                LEFT JOIN Subject s5 ON cs.Friday = s5.SubjectCode
                WHERE cs.Section = ?;
            `;

            db.query(queryJoin, [section], (error, scheduleResults) => {
                if (error) throw error;

                const reshapedSchedule = [];
                scheduleResults.forEach(item => {
                    reshapedSchedule.push({
                        time_slot: item.time_slot,
                        Monday: {
                            subject: item.SubjectMonday || '',
                            instructor: item.InstructorMonday || ''
                        },
                        Tuesday: {
                            subject: item.SubjectTuesday || '',
                            instructor: item.InstructorTuesday || ''
                        },
                        Wednesday: {
                            subject: item.SubjectWednesday || '',
                            instructor: item.InstructorWednesday || ''
                        },
                        Thursday: {
                            subject: item.SubjectThursday || '',
                            instructor: item.InstructorThursday || ''
                        },
                        Friday: {
                            subject: item.SubjectFriday || '',
                            instructor: item.InstructorFriday || ''
                        },
                    });
                });

                res.render('student/schedule.ejs', { schedule: reshapedSchedule });
            });
        });
    });
};

exports.renderDrawingBoard = (req, res) => {
    if (!req.session || !req.session.userCode) {
        return res.render("login.ejs", { errorMessage: "Login your account first." });
    }

    res.render('student/drawingboard.ejs');
}

exports.getAppointment = async (req, res) => {
    if (!req.session || !req.session.userCode) {
        return res.render("login.ejs", { errorMessage: "Login your account first." });
    }

    const userCode = req.session.userCode;

    const query = "SELECT * FROM Appointments WHERE SchoolCode = ?";
    db.query(query, [userCode], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send('Internal Server Error');
        } else {
            let status = "None";
            if (results.length > 0) {
                status = results[0].Status;
            }
            return res.render("student/appointment.ejs", { userCode, insertingStatus: '', status, results });
        }
    });
};

exports.postAppointment = async (req, res) => {
    if (!req.session || !req.session.userCode) {
        return res.render("login.ejs", { errorMessage: "Login your account first." });
    }

    const userCode = req.session.userCode;
    const { purpose, appointmentdate } = req.body;

    let status = "None";
    let results = [];

    const queryAppointment = "SELECT * FROM Appointments WHERE SchoolCode = ?";
    db.query(queryAppointment, [userCode], (err, queryResults) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send('Internal Server Error');
        } else {
            if (queryResults.length > 0) {
                status = queryResults[0].Status;
            }
            results = queryResults;

            if (!purpose || !appointmentdate) {
                return res.render("student/appointment.ejs", { userCode, insertingStatus: "Failed: Purpose and Date are required.", status, results });
            }

            const countSimilarDatesQuery = "SELECT COUNT(*) AS count FROM Appointments WHERE Date = ?";
            db.query(countSimilarDatesQuery, [appointmentdate], (countError, countResults) => {
                if (countError) {
                    console.error("Database error:", countError);
                    return res.status(500).send('Internal Server Error');
                }

                const existingCount = countResults[0].count;

                if (existingCount >= 5) {
                    return res.render("student/appointment.ejs", { userCode, insertingStatus: "Limit reached for this date.", status, results });
                }

                const insertQuery = "INSERT INTO Appointments (SchoolCode, Purpose, Date, Status) VALUES (?, ?, ?, 'Pending')";
                db.query(insertQuery, [userCode, purpose, appointmentdate], (error, result) => {
                    if (error) {
                        if (error.code === 'ER_DUP_ENTRY') {
                            return res.render("student/appointment.ejs", { userCode, insertingStatus: "Duplicate entry is not allowed.", status, results });
                        }
                        console.error(error);
                        return res.render("student/appointment.ejs", { userCode, insertingStatus: "Failed: Error inserting appointment.", status, results });
                    }

                    if (result.affectedRows === 1) {
                        return res.render("student/appointment.ejs", { userCode, insertingStatus: "Success: Appointment added.", status, results });
                    } else {
                        return res.render("student/appointment.ejs", { userCode, insertingStatus: "Failed: Error inserting appointment.", status, results });
                    }
                });
            });
        }
    });
};

exports.renderFeedback = async (req, res) => {
    if (!req.session || !req.session.userCode) {
        return res.render("login.ejs", { errorMessage: "Login your account first." });
    }

    let concern = req.body.concern;

    const userFeedback = "INSERT INTO Feedback (Concern) VALUES (?)";

    db.query(userFeedback, concern, (err, result) => {
        if (err) {
            console.error(err);
            return res.render("student/feedback.ejs", { insertingStatus: 'Failed to submit feedback.' });
        }

        db.commit();

        res.render("student/feedback.ejs", { insertingStatus: 'Feedback submitted successfully.' });
    });
};