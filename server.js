const express = require("express");
const app = express();

const db = require('./db');
const registrationController = require('./controllers/registrationController');
const loginController = require('./controllers/loginController');
const authController = require("./controllers/authController");

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + "/static"));

// Routes

app.get('/', (req, res) => {
    res.render("login.ejs", {errorMessage: '' });
});

app.post('/', authController.verifyUser);


app.get('/register', (req, res) => {
    res.render("register.ejs", {registrationResult: '' });
});

app.post('/register', authController.registerUser);


// Student Dashboard
app.get('/dashboard', (req, res) => {
    res.render("dashboard.ejs");
});




// End Routes
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});