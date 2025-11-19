import dotenv from "dotenv";
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import querystring from 'querystring';
import nodemailer from 'nodemailer';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======= PostgreSQL Connection =======
const pool = new Pool({
  host: "dpg-d45pc5umcj7s739612kg-a.oregon-postgres.render.com",
  user: "charitydb_7k9p_user",
  password: "YeNBbUpDvzsMXG5AnTCsuI0E4F45ZlZu",
  database: "charitydb_7k9p",
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch(err => console.error("❌ Database connection error:", err));

// ======= Email Transporter =======
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'charityorgteam@gmail.com',
    pass: process.env.GMAIL_PASS || 'ayggpbpdousocdzo'
  }
});

// ======= Helper to serve static files =======

function serveFile(res, filePath, contentType = 'text/html') {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// ======= Server =======
const server = http.createServer((req, res) => {
  console.log(`[${req.method}] ${req.url}`);

 if (req.method === 'GET') {

  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const extname = path.extname(filePath);
  let contentType = 'text/html';

  if (extname === '.css') contentType = 'text/css';
  if (extname === '.js') contentType = 'text/javascript';

  serveFile(res, filePath, contentType);
  return;  // <-- THIS FIXES YOUR 404 ISSUE
}


  else if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());

    req.on('end', async () => {
      const data = querystring.parse(body);

      // ===== Volunteer form =====
      if (req.url === '/submit') {
        const { name, email, phone, interest, message } = data;

        if (!name || !email || !phone || !interest) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          return res.end('Missing required fields');
        }

        try {
          await pool.query(
            'INSERT INTO volunteers(fullname,email,phone,area_of_interest,reason) VALUES($1,$2,$3,$4,$5)',
            [name, email, phone, interest, message]
          );

          // await transporter.sendMail({
          //   from: process.env.GMAIL_USER,
          //   to: email,
          //   subject: 'Thank You for Volunteering!',
          //   text: `Hello ${name},\n\nWe’ve received your volunteer application for the ${interest} team.\n\nThank you for choosing to make an impact!\n\n— Charity Support Team`
          // });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<h2>Submission Successful</h2><p>Thank you for volunteering, ${name}!</p><a href="/">Back to Home</a>`);

        } catch (err) {
          console.error(err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Database error occurred');
        } 
      }
      

      // ===== Newsletter form =====
      else if (req.url === '/subscribe') {
        const { email } = data;
        if (!email) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          return res.end('Email is required');
        }

        try {
          await pool.query('INSERT INTO newsletter(email) VALUES($1)', [email]);

          // await transporter.sendMail({
          //   from: process.env.GMAIL_USER,
          //   to: email,
          //   subject: 'Thank You for Subscribing!',
          //   html: `<div style="font-family: Arial; color:#333;">
          //           <h2>Thank you for subscribing!</h2>
          //           <p>You're now part of our mailing list — we’ll keep you updated.</p>
          //           <p>— Charity Team</p>
          //         </div>`
          // });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h2>Subscription Successful!</h2><a href="./index.html">Back to Home</a>');

        } 
        catch (err) {
    console.error('❌ DATABASE ERROR:', err.message);
    console.error(err.stack);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Database error: ${err.message}`);
}
      }

      // ===== Unknown POST route =====
      else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });
  }

  // ===== Other methods =====
  else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
