const express = require("express");
const app = express();

const db = require('./db');
const registrationController = require('./registrationController');
const loginController = require('./loginController');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes

// Login (loginController.js)
app.get('/', (req, res) => {
    res.render("login.ejs", {errorMessage: '' });
});

app.post('/', loginController.loginUser);


// Registration (registrationController.js)
app.get('/register', (req, res) => {
    res.render("register.ejs", {registrationResult: '' });
});

app.post('/register', registrationController.registerUser);


// Student Dashboard
app.get('/dashboard', (req, res) => {
    res.render("dashboard.ejs");
});




// End Routes
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});