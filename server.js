"use strict";
require("dotenv").config();
const express = require("express");
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const passport = require("passport");
const session = require("express-session");
const passportSocketIo = require("passport.socketio");
const MongoStore = require("connect-mongo")(session);
const cookieParser = require("cookie-parser");
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

const routes = require("./routes");
const auth = require("./auth");

const app = express();

const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.set("view engine", "pug");
app.set("views", "./views/pug");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
    key: "express.sid",
    store,
  })
);

app.use(passport.initialize());
app.use(passport.session());

fccTesting(app); //For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

io.use(
  passportSocketIo.authorize({
    cookieParser,
    key: "express.sid",
    secret: process.env.SESSION_SECRET,
    store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail,
  })
);

function onAuthorizeSuccess(data, accept) {
  console.log("successful connection to socket.io");
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log("failed connection to socket.io:", message);
  accept(null, false);
}

myDB(async (client) => {
  const myDataBase = await client.db("database").collection("users");

  routes(app, myDataBase);
  auth(app, myDataBase);

  // connect/disconnect notification
  let currentUsers = 0;
  io.on("connection", (socket) => {
    ++currentUsers;
    io.emit("user", {
      username: socket.request.user.username,
      currentUsers,
      connected: true,
    });
    console.log("A user has connected");

    // listen to message from client
    socket.on("chat message", (message) => {
      io.emit("chat message", {
        username: socket.request.user.username,
        message,
      });
    });

    socket.on("disconnect", () => {
      console.log("A user has disconnected");
      --currentUsers;
      io.emit("user", {
        username: socket.request.user.username,
        currentUsers,
        connected: false,
      });
    });
  });
}).catch((e) => {
  app.route("/").get((req, res) => {
    res.render("index", { title: e, message: "Unable to connect to database" });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
