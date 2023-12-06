const db = require("../db");
const bcrypt = require("bcrypt");
const saltRounds = 10; // Number of salt rounds to use


function registerUser(req, response) {
    let firstName = req.body.firstName;
    let middleName = req.body.middleName;
    let lastName = req.body.lastName;
    let nameExtension = req.body.nameExtension;
    let birthdate = req.body.birthdate;
    let gender = req.body.gender;
    let permanentAddress = req.body.permanentAddress;
    let currentAddress = req.body.currentAddress;
    let emailAddress = req.body.emailAddress;
    let contactNumber = req.body.contactNumber;
    let password = req.body.password;
    let pwHash = "";

    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
          console.error('Error hashing password:', err);
        } else {
          // Store the hashed password in your database
          console.log('Hashed Password:', hash);
          pwHash = hash;

          db.beginTransaction();

            try {
                const userCredentialsQuery = "INSERT INTO UserCredentials (Email, Password) VALUES (?, ?)";
                const userCredentialsParams = [emailAddress, pwHash];
                
                db.query(userCredentialsQuery, userCredentialsParams, (err, res) => {
                    const userID = res.insertId;

                    const userProfileQuery = "INSERT INTO UserProfile (UserID, FirstName, MiddleName, LastName, NameExtension, Birthdate, Gender, ContactNumber, Email, PermanentAddress, CurrentAddress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    const userProfileParams = [userID, firstName, middleName, lastName, nameExtension, birthdate, gender, contactNumber, emailAddress, permanentAddress, currentAddress];
                    
                    db.query(userProfileQuery, userProfileParams, (err, res) => {
                        db.commit();

                        console.log(`Registered user: ${req.body}`);

                        response.redirect("dashboard");
                    }); 
                });    
            } catch (error) {
                connection.rollback().then();
                console.error('Error registering user:', error.message);
            }
        }
    });

}

function verifyUser(req, response) {
    let userCode = req.body.userCode;
    let password = req.body.password;

    const query = "SELECT * FROM UserCredentials WHERE UserCode=?";
    const params = [userCode];

    db.query(query, params, (err, res) => {
        if (res.length == 0) {
            response.sendStatus(401);
        }

        let user = res[0];
        let pwHash = user.Password;

        bcrypt.compare(password, pwHash, (err, result) => {
            if (err) {
                console.error('Error comparing passwords:', err);
            } else {
                if (result) {
                    response.redirect("dashboard")
                } else {
                    response.sendStatus(401);
                }
            }
        });
    });
}

module.exports = {
    registerUser: registerUser,
    verifyUser: verifyUser,
}
