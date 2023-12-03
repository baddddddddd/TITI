const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Labyu_123',
    database: 'student_portal',
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        throw err; // Throw an error to terminate the application if the connection fails
    }
    console.log('Connected to MySQL database');
});

// Additional error handling for database queries
connection.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Error executing test query:', err);
        throw err; // Throw an error to terminate the application if the test query fails
    }
    console.log('Test query executed successfully');
});

module.exports = connection;