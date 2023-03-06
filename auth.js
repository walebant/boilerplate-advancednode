const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const { ObjectID } = require("mongodb");
const GithubStrategy = require("passport-github").Strategy;
require("dotenv").config();

module.exports = function (app, myDataBase) {
  passport.use(
    new LocalStrategy((username, password, done) => {
      myDataBase.findOne({ username }, (err, user) => {
        console.log(`User ${username} attempted to log in.`);
        if (err) return done(err);
        if (!user) return done(null, false);
        if (!bcrypt.compareSync(password, user.password)) {
          return done(null, false);
        }
        return done(null, user);
      });
    })
  );

  passport.use(
    new GithubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "https://729qc4-8000.preview.csb.app/auth/github/callback",
      },
      function (accessToken, refreshToken, profile, cb) {
        // 1. load the user's database object if it exists
        // 2. or create one if it doesn't,
        // and populate the fields from the profile
        // then return the user's object
        myDataBase.findOneAndUpdate(
          { id: profile.id },
          {
            $setOnInsert: {
              id: profile.id,
              username: profile.username,
              name: profile.displayName || "John Doe",
              photo: profile.photos[0].value || "",
              email: Array.isArray(profile.emails)
                ? profile.emails[0].value
                : "No public email",
              created_on: new Date(),
              provider: profile.provider || "",
            },
            $set: {
              last_login: new Date(),
            },
            $inc: {
              login_count: 1,
            },
          },
          { upsert: true, new: true },
          (err, doc) => {
            return cb(null, doc.value);
          }
        );
      }
    )
  );

  // Serialization and deserialization
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      return done(null, doc);
    });
  });
};
