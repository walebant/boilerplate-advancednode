const passport = require("passport");
const bcrypt = require("bcrypt");

module.exports = function (app, myDataBase) {
  // Homepage
  app.route("/").get((req, res) => {
    res.render("index", {
      title: "Connected to Database",
      message: "Please login",
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true,
    });
  });

  // GitHub Auth
  app
    .route("/auth/github")
    .get(passport.authenticate("github"), (req, res, next) => {});

  app
    .route("/auth/github/callback")
    .get(
      passport.authenticate("github", { failureRedirect: "/" }),
      (req, res) => {
        req.session.user_id = req.user.id;
        res.redirect("/chat");
      }
    );

  // Profile
  app.route("/profile").get(ensureAuthenticated, (req, res) => {
    res.render("profile", { username: req.user.username });
  });

  // Register
  app.route("/register").post(
    (req, res, next) => {
      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) next(err);
        if (user) res.redirect("/");
        const hash = bcrypt.hashSync(req.body.password, 12);

        myDataBase.insertOne(
          { username: req.body.username, password: hash },
          (err, doc) => {
            if (err) res.redirect("/");
            next(null, doc.ops[0]);
          }
        );
      });
    },
    passport.authenticate("local", { failureRedirect: "/" }),
    (req, res, next) => {
      res.redirect("/profile");
    }
  );

  // Login
  app
    .route("/login")
    .post(
      passport.authenticate("local", { failureRedirect: "/" }),
      (req, res, next) => {
        res.redirect("/profile");
      }
    );

  // Logout
  app.route("/logout").get((req, res) => {
    req.logout();
    res.redirect("/");
  });

  app.route("/chat").get(ensureAuthenticated, (req, res, next) => {
    res.render("chat", { user: req.user });
  });

  // Error handling
  app.use((req, res, next) => {
    res.status(404).type("text").send("Not Found");
  });

  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/");
  }
};
