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