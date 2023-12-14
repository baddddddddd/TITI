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
        return res.render("adminDashboard.ejs", { adminName: adminDetails.AdminName, adminId: adminDetails.AdminID });
    });
};

exports.renderFeedback = (req, res) => {
    console.log("Session:", req.session);

    if (!req.session || !req.session.adminID) {
        return res.render("admin.ejs", { errorMessage: "Login your account first." });
    }

    // Fetch feedback data from the database
    db.query("SELECT FeedbackID, Concern FROM Feedback", (error, results) => {
        if (error) {
            console.error("Error fetching feedback data:", error);
            return res.status(500).send("Internal Server Error");
        }

        // Render the feedback data along with delete buttons
        res.render("adminFeedback.ejs", { feedbackData: results });
    });
};

exports.renderAppointments = (req, res) => {
    console.log("Session:", req.session);

    if (!req.session || !req.session.adminID) {
        return res.render("admin.ejs", { errorMessage: "Login your account first." });
    }

    // Update the SQL query to order by the Date column
    db.query("SELECT SchoolCode, AppointmentID, Date, Purpose, Status FROM Appointments ORDER BY Date", (error, results) => {
        if (error) {
            console.error("Error fetching appointment data:", error);
            return res.status(500).send("Internal Server Error");
        }

        res.render("adminAppointments.ejs", { appointmentData: results });
    });
};

exports.handleAppointment = (req, res) => {
    const { appointmentID, action } = req.body;

    if (!appointmentID || !action) {
        return res.status(400).send("AppointmentID and action are required.");
    }

    if (action === 'delete') {
        // Delete the appointment from the database
        db.query('DELETE FROM Appointments WHERE AppointmentID = ?', [appointmentID], (error, results) => {
            if (error) {
                console.error("Error deleting appointment:", error);
                return res.status(500).send("Internal Server Error");
            }

            console.log("Appointment deleted successfully.");
            res.redirect('/admin/dashboard/appointments');
        });
    } else {
        // Handle other actions (approve, decline, etc.)
        let status;
        switch (action) {
            case 'approve':
                status = 'Approved';
                break;
            case 'decline':
                status = 'Declined';
                break;
            default:
                return res.status(400).send("Invalid action.");
        }

        db.query('UPDATE Appointments SET Status = ? WHERE AppointmentID = ?', [status, appointmentID], (error, results) => {
            if (error) {
                console.error(`Error updating appointment status to ${status}:`, error);
                return res.status(500).send("Internal Server Error");
            }

            console.log(`Appointment ${status} successfully.`);
            res.redirect('/admin/dashboard/appointments');
        });
    }
};