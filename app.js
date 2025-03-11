const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const hbs = require("express-handlebars");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const http = require('http');
const db = require("./config/connection");

// Import routed
const usersRouter = require("./routes/users");
const adminRouter = require("./routes/admin");
const psychiatristRouter = require("./routes/psychiatrist");

const app = express();
const server = http.createServer(app);

// Handlebars setup
const hbsConfig = {
  extname: "hbs",
  defaultLayout: "layout",
  layoutsDir: path.join(__dirname, "views/layout/"),
  partialsDir: path.join(__dirname, "views/header-partials/"),
  helpers: {
    incremented: (index) => index + 1,
    eq: (a, b) => a === b,
    formatDate: (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    formatTimes: (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    formatDateDD: function (dateString) {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const year = date.getFullYear();
      return `${day}-${month}-${year}`; // Return the formatted date
    },
    formatTime:function(timeString) {
      if (!timeString) return '';
    
      // Split the time string into hours and minutes
      var parts = timeString.split(':');
      var hours = parseInt(parts[0], 10);
      var minutes = parts[1] || '00'; // default to '00' if minutes are missing
    
      // Determine AM or PM
      var period = hours >= 12 ? 'PM' : 'AM';
    
      // Convert 24-hour time to 12-hour format
      hours = hours % 12;
      if (hours === 0) hours = 12;
    
      // Ensure minutes are two digits (optional)
      if (minutes.length === 1) {
        minutes = '0' + minutes;
      }
    
      return hours + ':' + minutes + ' ' + period;
    },
    questionNumber: function(index) {
      return index + 1;
    },
    addOne: (value) => parseInt(value, 10) + 1,
    ifCond: function(v1, operator, v2, options) {
      switch (operator) {
        case '==':
          return (v1 == v2) ? options.fn(this) : options.inverse(this);
        // Add other operators as needed
        default:
          return options.inverse(this);
      }
    },

    getStatus: (date) => new Date(date) < new Date() ? 'Completed' : 'Upcoming',
    firstChar: function (str) {
      return str ? str.charAt(0).toUpperCase() : '';
  }
  }
};

app.engine("hbs", hbs(hbsConfig));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// Middleware
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(fileUpload());
app.use(session({
  secret: process.env.SESSION_SECRET || "YourSecretKey",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000, secure: process.env.NODE_ENV === 'production' }
}));

// Database Connection
db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
    return;
  }
  console.log("\x1b[32mDatabase Connected Successfully ✅\x1b[0m");
  console.log("\x1b[32mServer running at http://localhost:4003/ ✅\x1b[0m");
});

// Routes
app.use("/", usersRouter);
app.use("/admin", adminRouter);
app.use("/psychiatrist", psychiatristRouter);

// Socket.io Chat Logic


// Error Handlers
app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

module.exports = { app, server };
