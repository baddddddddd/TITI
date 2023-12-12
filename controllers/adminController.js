const db = require("../db");

exports.renderAdminDashboard = (req, res) => {
    console.log("Session:", req.session);

    if (!req.session || !req.session.adminID) {
        return res.render("admin.ejs", { errorMessage: "Login your account first." });
    }

    const adminID = req.session.adminID;
    const getUserIdQuery = "SELECT AdminID, AdminName FROM Admin WHERE AdminID = ?";

    // Fetch AdminID and AdminName from the database
    db.query(getUserIdQuery, [adminID], (err, result) => {
        if (err) {
            // Handle the error
            return res.render("admin.ejs", { errorMessage: "Error fetching admin details." });
        }

        const adminDetails = result[0]; // Assuming you expect only one result

        // Pass AdminName to the rendering of adminDashboard.ejs
        return res.render("adminDashboard.ejs", { adminName: adminDetails.AdminName });
    });
};