const db = require("../db");

exports.renderDashboard = (req, res) => {
    console.log("Session:", req.session); // Log the session object

    if (!req.session || !req.session.userCode) {
        return res.render("login.ejs", { errorMessage: "Login your account first." });
    }

    const userCode = req.session.userCode;
    const getUserIdQuery = "SELECT UserID FROM UserCredentials WHERE userCode = ?";

    db.query(getUserIdQuery, [userCode], (err, userIdResults) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send('Internal Server Error');
        }

        if (userIdResults.length > 0) {
            const userId = userIdResults[0].UserID;

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

                    res.render("dashboard.ejs", {
                        userCode: userCode,
                        firstName: firstName,
                        lastName: lastName,
                        middleName: middleName,
                        extensionName: extensionName,
                        strand: strand,
                        section: section,
                        enrollmentStatus: enrollmentStatus
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
            return res.render("error.ejs", { errorMessage: "User information not found for the provided UserCode." });
        }

        const userID = userCredentialsResults[0].UserID;

        db.query('SELECT Section FROM StudentInformation WHERE UserID = ?', [userID], (error, studentInfoResults) => {
            if (error) throw error;

            if (studentInfoResults.length === 0 || !studentInfoResults[0].Section) {
                return res.render("error.ejs", { errorMessage: "Section information not found for the user." });
            }

            const section = studentInfoResults[0].Section;

            db.query('SELECT cs.*, sub.SubjectName, sub.Instructor FROM ClassSchedule cs LEFT JOIN Subject sub ON cs.Monday = sub.SubjectCode WHERE cs.Section = ?', [section], (error, scheduleResults) => {
                if (error) throw error;

                const reshapedSchedule = [];
                scheduleResults.forEach(item => {
                    reshapedSchedule.push({
                        time_slot: item.time_slot,
                        Monday: item.SubjectName,
                        Tuesday: item.SubjectName,
                        Wednesday: item.SubjectName,
                        Thursday: item.SubjectName,
                        Friday: item.SubjectName,
                        Instructor: item.Instructor
                    });
                });

                res.render('schedule.ejs', { schedule: reshapedSchedule });
            });
        });
    });
}

exports.renderDrawingBoard = (req, res) => {
    if (!req.session || !req.session.userCode) {
        return res.render("login.ejs", { errorMessage: "Login your account first." });
    }

    res.render('drawingboard.ejs');
}

exports.renderAppointment = async (req, res) => {
    if (!req.session || !req.session.userCode) {
        return res.render("login.ejs", { errorMessage: "Login your account first." });
    }

    const userCode = req.session.userCode;
    const query = "SELECT * FROM Appointments WHERE SchoolCode = ?";

    db.query(query, [userCode], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send('Internal Server Error');
        }

        let status = "None";

        if (results.length > 0) {
            status = results[0].Status;
        }

        if (req.method === 'POST') {
            const { purpose, appointmentdate } = req.body;
        
            if (!purpose || !appointmentdate) {
                return res.render("appointment.ejs", { userCode, insertingStatus: "Failed: Purpose and Date are required." });
            }
        
            const countSimilarDatesQuery = "SELECT COUNT(*) AS count FROM Appointments WHERE Date = ?";
            db.query(countSimilarDatesQuery, [appointmentdate], (countError, countResults) => {
                if (countError) {
                    console.error("Database error:", countError);
                    return res.status(500).send('Internal Server Error');
                }
        
                const existingCount = countResults[0].count;
        
                if (existingCount >= 5) {
                    return res.render("appointment.ejs", { userCode, status, insertingStatus: "Limit reached for this date." });
                } else {
                    const insertQuery = "INSERT INTO Appointments (SchoolCode, Purpose, Date, Status) VALUES (?, ?, ?, 'Pending')";
                    db.query(insertQuery, [userCode, purpose, appointmentdate], (error, result) => {
                        if (error) {
                            if (error.code === 'ER_DUP_ENTRY') {
                                return res.render("appointment.ejs", { userCode, status, insertingStatus: "Duplicate entry is not allowed." });
                            }
        
                            console.error(error);
                            return res.render("appointment.ejs", { userCode, status, insertingStatus: "Failed: Error inserting appointment." });
                        }
        
                        if (result.affectedRows === 1) {
                            return res.render("appointment.ejs", { userCode, status, insertingStatus: "Success: Appointment added." });
                        } else {
                            return res.render("appointment.ejs", { userCode, status, insertingStatus: "Failed: Error inserting appointment." });
                        }
                    });
                }
            });
        } else {
            res.render("appointment.ejs", { userCode, status, insertingStatus: '' });
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
            return res.render("feedback.ejs", { insertingStatus: 'Failed to submit feedback.' });
        }

        db.commit();

        res.render("feedback.ejs", { insertingStatus: 'Feedback submitted successfully.' });
    });
};