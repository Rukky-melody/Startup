import dotenv from "dotenv";
import http from 'http';
import fs from 'fs';
import path from 'path';
import querystring from 'querystring';
import nodemailer from 'nodemailer';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

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
    user: 'charityorgteam@gmail.com',
    pass: 'ayggpbpdousocdzo' // your Gmail app password
  }
});

// ======= Server =======
const server = http.createServer((req, res) => {
  console.log(`[${req.method}] ${req.url}`);

  // === Serve static files ===
  if (req.method === 'GET') {
    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath);
    let contentType = 'text/html';

    switch (extname) {
      case '.css':
        contentType = 'text/css';
        break;
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.json':
        contentType = 'application/json';
        break;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  }

  // ===== Submit Volunteer Form =====
  else if (req.method === 'POST' && req.url === '/submit') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());

    req.on('end', async () => {
      const data = querystring.parse(body);
      const { name, email, phone, interest, message } = data;

      if (!name || !email || !phone || !interest) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Missing required fields');
      }

      try {
        await pool.query(
          'INSERT INTO volunteers (fullname, email, phone, area_of_interest, reason) VALUES ($1, $2, $3, $4, $5)',
          [name, email, phone, interest, message]
        );

        // Send confirmation email
        const mailOptions = {
          from: 'charityorgteam@gmail.com',
          to: email,
          subject: 'Thank You for Volunteering!',
          text: `Hello ${name},\n\nWe’ve received your volunteer application for the ${interest} team.\n\nThank you for choosing to make an impact!\n\n— Charity Support Team`
        };
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) console.error('Email error:', error);
          else console.log('Volunteer email sent:', info.response);
        });

        // Send success response
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head>
              <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500&display=swap" rel="stylesheet">
              <style>
                body { display:flex; align-items:center; justify-content:center; height:100vh; background:#f4f8ff; margin:0; }
                .card { background:#fff; padding:40px; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.1); text-align:center; font-family:'Poppins', sans-serif; }
                .card h2 { color:#007bff; margin-bottom:10px; }
                .card p { color:#555; font-size:1rem; }
                .card a { display:inline-block; margin-top:20px; text-decoration:none; color:white; background:#007bff; padding:10px 18px; border-radius:6px; transition:0.3s; }
                .card a:hover { background:#0056b3; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>Submission Successful</h2>
                <p>Thank you for volunteering, ${name}!</p>
                <a href="./index.html">Back to Home</a>
              </div>
            </body>
          </html>
        `);

      } catch (err) {
        console.error('Database insert error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Database error occurred');
      }
    });
  }

  // ===== Newsletter Subscription =====
  else if (req.method === 'POST' && req.url === '/subscribe') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());

    req.on('end', async () => {
      const data = querystring.parse(body);
      const email = data.email;

      if (!email) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Email is required');
      }

      try {
        await pool.query('INSERT INTO newsletter (email) VALUES ($1)', [email]);

        const mailOptions = {
          from: 'charityorgteam@gmail.com',
          to: email,
          subject: 'Thank You for Subscribing!',
          html: `<div style="font-family: Arial; color:#333;">
                  <h2>Thank you for subscribing!</h2>
                  <p>You're now part of our mailing list — we’ll keep you updated.</p>
                  <p>— Charity Team</p>
                </div>`
        };
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) console.error('Newsletter email error:', err);
          else console.log('Newsletter email sent:', info.response);
        });

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>Subscription Successful!</h2><a href="./index.html">Back to Home</a>');

      } catch (err) {
        console.error('Newsletter insert error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Database error occurred');
      }
    });
  }

  // ===== Default: Method Not Allowed =====
  else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
