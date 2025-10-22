const http = require('http');
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const nodemailer = require('nodemailer');

// ======= MySQL Connection =======
const db = mysql.createConnection({
  host: 'banutq3jmkj5spunnnpr-mysql.services.clever-cloud.com',
  user: 'uu1igkcgb6pvx5ye',
  password: 'OfubLinYqeR6mpFSCIhN',
  database: 'banutq3jmkj5spunnnpr',
  port: 3306
});

db.connect(err => {
  if (err) {
    console.error('MySQL error:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// ======= Email Transporter =======
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'charityorgteam@gmail.com',
    pass: 'ayggpbpdousocdzo' // i generated this password from my charityteamorg gmail account 
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
//=====Submit Route==========//
  else if (req.method === 'POST' && req.url === '/submit') {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const data = querystring.parse(body);
    console.log('Parsed Data:', data);

    const { name, email, phone, interest, message } = data;

    if (!name || !email || !phone || !interest) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Missing required fields');
    }

    const sql = 'INSERT INTO volunteers (fullname, email, phone, interest, message) VALUES (?, ?, ?, ?, ?)';

    db.query(sql, [name, email, phone, interest, message], (err) => {
      if (err) {
        console.error('Insert error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Database error');
      }

// === Send Email After Successful Insert ===

      const mailOptions = {
        from: 'charityorgteam@gmail.com',
        to: email, // send to user who submitted the form
        subject: 'Thank You for Volunteering!',
        text: `Hello ${name},\n\nWe’ve received your volunteer application for the ${interest} team.\n\nThank you for choosing to make an impact!\n\n— Charity Support Team`
      };
      
//==== Send the email ====

     transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Email error:', error);
        } else {
          console.log('Verification email sent:', info.response);
        }
      });

//====Response back to brwoser or to client====
     res.writeHead(200, { 'Content-Type': 'text/html' });
res.end(`
  <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500&display=swap" rel="stylesheet">
      <style>
        body {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background-color: #f4f8ff;
          margin: 0;
        }
        .card {
          background: #fff;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          text-align: center;
          font-family: 'Poppins', sans-serif;
        }
        .card h2 {
          color: #007bff;
          margin-bottom: 10px;
        }
        .card p {
          color: #555;
          font-size: 1rem;
        }
        .card a {
          display: inline-block;
          margin-top: 20px;
          text-decoration: none;
          color: white;
          background: #007bff;
          padding: 10px 18px;
          border-radius: 6px;
          transition: 0.3s;
        }
        .card a:hover {
          background: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Subscription Successful</h2>
        <p>Thank you for volunteering! ${name} Make sure to subscribe to our Newsletter to recieve more informations.</p>
        <a href="./index.html">Back to Home</a>
      </div>
    </body>
  </html>
`);

    });
  });
}

//===== Newsletter Subscription Route =====//

else if (req.method === 'POST' && req.url === '/subscribe') {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const data = querystring.parse(body);
    const email = data.email;

    if (!email) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Email is required');
    }

    // === Save to database ===
    
    const sql = 'INSERT INTO newsletter (email) VALUES (?)';
    db.query(sql, [email], (err) => {
      if (err) {
        console.error('❌ Newsletter insert error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Database error');
      }

      // === Send confirmation email ===
      const mailOptions = {
        from: 'ofumanamelody350@gmail.com',
        to: email,
        subject: 'Thank You for Subscribing!',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Thank you for subscribing!</h2>
            <p>You're now part of our mailing list — we’ll keep you updated with our latest news and events.</p>
            <br>
            <p>— The Charity Team</p>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Email error:', error);
        } else {
          console.log('Newsletter confirmation email sent:', info.response);
        }
      });

      // === Send success response to browser ===
      // === Send success response to browser ===
res.writeHead(200, { 'Content-Type': 'text/html' });
res.end(`
  <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500&display=swap" rel="stylesheet">
      <style>
        body {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background-color: #f4f8ff;
          margin: 0;
        }
        .card {
          background: #fff;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          text-align: center;
          font-family: 'Poppins', sans-serif;
        }
        .card h2 {
          color: #007bff;
          margin-bottom: 10px;
        }
        .card p {
          color: #555;
          font-size: 1rem;
        }
        .card a {
          display: inline-block;
          margin-top: 20px;
          text-decoration: none;
          color: white;
          background: #007bff;
          padding: 10px 18px;
          border-radius: 6px;
          transition: 0.3s;
        }
        .card a:hover {
          background: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Subscription Successful</h2>
        <p>Thank you for subscribing! You will start receiving updates soon.</p>
        <a href="./index.html">Back to Home</a>
      </div>
    </body>
  </html>
`);

    });
  });
}


  // === Default: method not allowed ===
  else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});


// ======= Start Server =======
const PORT = 3000;
server.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
