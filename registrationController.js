const db = require('./db');
function registerUser(req, res) {
    const { name, password, age, contactno, email } = req.body;

    // Check if all required fields are provided // Pwede na ata areng wala
    if (!name || !password || !age || !contactno || !email) {
        // Display error message on the registration page
        return res.status(400).render('register.ejs', { registrationResult: 'Failed registration.' });
    }

    // Insert data into the database
    const insertQuery = 'INSERT INTO student_info (Name, Password, Age, ContactNo, Email) VALUES (?, ?, ?, ?, ?)';
    db.query(insertQuery, [name, password, age, contactno, email], (err, results) => {
        if (err) {
            console.error('Error registering user:', err);
            // Display error message on the registration page
            return res.status(500).render('register.ejs', { registrationResult: 'Failed registration.' });
        }

        // Fetch the SchoolCode for the newly registered user
        const fetchQuery = 'SELECT SchoolCode FROM student_info WHERE Email = ?';
        db.query(fetchQuery, [email], (err, results) => {
            if (err) {
                console.error('Error fetching SchoolCode:', err);
                // Display error message on the registration page
                return res.status(500).render('register.ejs', { registrationResult: 'Failed to fetch SchoolCode.' });
            }

            // Send a success status with the SchoolCode
            const schoolCode = results[0].SchoolCode;
            res.render('register.ejs', { registrationResult: `Your SchoolCode is ${schoolCode}` });
        });
    });
}

module.exports = {
    registerUser: registerUser
};