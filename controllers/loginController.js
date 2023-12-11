const db = require('../db'); // Adjust the path accordingly

function loginUser(req, res) {
    const { schoolcode, password } = req.body;

    // Check if schoolcode and password are provided
    if (!schoolcode || !password) {
        return res.render("login.ejs", { errorMessage: "Please provide both School ID and Password." });
    }

    // Query the database to check for a matching recordPassword
    const query = "SELECT * FROM student_info WHERE SchoolCode = ? AND  = ?";
    db.query(query, [schoolcode, password], (err, results) => {
        if (err) {
            console.error(err);
            return res.render("login.ejs", { errorMessage: "Internal server error." });
        }

        // Check if a matching record was found
        if (results.length > 0) {
            // Redirect to dashboard if successful
            res.redirect("/dashboard");
        } else {
            // Display an error message if no matching record is found
            res.render("login.ejs", { errorMessage: "Incorrect School ID or Password." });
        }
    });
}

module.exports = {
    loginUser: loginUser
};