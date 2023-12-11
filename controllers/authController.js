const db = require("../db");
const nodemailer = require('nodemailer');
const bcrypt = require("bcrypt");
const saltRounds = 10; // Number of salt rounds to use

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'pogisijamesmagnaye@gmail.com',
      pass: 'jumpxeqruaiaptnk',
    },
});

async function registerUser(req, response) {
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
    let section = req.body.section
    let strand = req.body.strand
    let enrollmentStatus = req.body.enrollmentStatus

    bcrypt.hash(password, saltRounds, async (err, hash) => {
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
                    
                    db.query(userProfileQuery, userProfileParams, async (err, res) => {
                        const userInformationQuery = "INSERT INTO StudentInformation (UserID, Section, Strand, EnrollmentStatus) VALUES (?, ?, ?, ?)";
                        const userInformationParams = [userID, section, strand, enrollmentStatus];

                        db.query(userInformationQuery, userInformationParams, async (err, res) => {
                            db.commit();
                            const selectUserCodeQuery = "SELECT UserCode FROM UserCredentials WHERE UserID = ?";
                            const selectUserCodeParams = [userID];

                            db.query(selectUserCodeQuery, selectUserCodeParams, async (err, res) => {
                                if (err) {
                                    console.error('Error selecting UserCode:', err);
                                } else {
                                    const userCode = res[0].UserCode;
                                    try {
                                        await sendEmail(emailAddress, userCode);
                                        response.render('register.ejs', { registrationResult: `Your UserCode is ${userCode}` });
                                    } catch (error) {
                                        console.error('Error sending email:', error);
                                        response.status(500).render('register.ejs', { registrationResult: 'Failed to send email.' });
                                    }
                                
                                }
                            });
                        });
                    });
                });
            } catch (error) {
                connection.rollback().then();
                console.error('Error registering user:', error.message);
            }
        }
    });
}

async function sendEmail(emailAddress, userCode) {
    const mailOptions = {
        from: 'testsubject.studentportal@gmail.com',
        to: emailAddress,
        subject: 'Welcome to your school account!',
        text: `Your school code is: ${userCode}.\nYour password is 123.`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${emailAddress} with school code: ${userCode}`);
    } catch (error) {
        console.error('An error occurred:', error);
        throw new Error('Failed to send email');
    }
}

function verifyUser(req, response) {
    let userCode = req.body.userCode;
    let password = req.body.password;

    const query = "SELECT * FROM UserCredentials WHERE UserCode=?";
    const params = [userCode];


    db.query(query, params, (err, res) => {
        if (res.length == 0) {
            response.render("../views/login.ejs", { userCode: userCode });
            return;
        }

        let user = res[0];
        let pwHash = user.Password;

        bcrypt.compare(password, pwHash, (err, result) => {
            if (err) {
                console.error('Error comparing passwords:', err);
            } else {
                if (result) {    
                    req.session.userCode = userCode;
                    req.session.userId = user.UserID;
                    response.redirect("dashboard");
                } else {
                    response.render("../views/login.ejs", { userCode: userCode, errorMessage: "Incorrect password or email" });
                }
            }
        });
    });
}

function verifyAdmin(req, response) {
    let adminID = req.body.adminID;
    let adminPassword = req.body.adminPassword;

    const query = "SELECT * FROM Admin WHERE AdminID=?";
    const params = [adminID];

    db.query(query, params, (err, res) => {
        if (err) {
            console.error('Error querying the database:', err);
            response.status(500).send("Internal Server Error");
            return;
        }

        if (res.length === 0) {
            response.render("../views/admin.ejs", { adminID: adminID });
            return;
        }

        let user = res[0];

        if (adminPassword === user.AdminPassword) {
            // req.session.adminID = adminID;
            response.redirect("/register");
        } else {
            response.render("../views/admin.ejs", {errorMessage: "Incorrect password or email" });
        }
    });
}

module.exports = {
    registerUser: registerUser,
    verifyUser: verifyUser,
    verifyAdmin: verifyAdmin
}
