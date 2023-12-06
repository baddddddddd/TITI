const mysql = require('mysql');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
});

console.log("Connecting to database...");
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        throw err;
    }
    console.log('Successfully connected to database.');
});

console.log("Executing test query...")
connection.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Error executing test query:', err);
        throw err;
    }
    console.log('Test query executed successfully.');
});

module.exports = connection;
