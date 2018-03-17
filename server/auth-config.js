const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
const saltRounds = 10;
let db = require('../../database-mysql');
let bodyParser = require('body-parser');

module.exports = function (passport) {
  passport.serializeUser(function (user, done) { // creating sessions
    done(null, user);
  });
  passport.deserializeUser(function (user, done) {
    // need to put in a DB query here
    done(null, user);
  });
  // LOCAL LOGIN STRATEGY
  passport.use('local-login', new LocalStrategy( 
    async (email, password, cb) => {
      const userInfo = await db.getUserByEmail(email); // will need to change this for our db function
      if (userInfo.length) {
        let user = userInfo[0];
        bcrypt.compare(password, user.password, (err, res) => {
          if (err) {
            cb(err, null);
          } else if (res === false) {
            cb(null, false);
          } else {
            cb(null, user);
          }
        })
      } else {
        cb(null, false);
      }
    })
  );

  //LOCAL SIGNUP Strategy
  passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  },
    async (req, email, password, cb) => {
      const body = req.body;
      const firstname = body.firstname;
      const lastname = body.lastname;
      const bio = body.bio;
      const role = body.role;
      const location = body.zipcode;
      const race = body.race;
      const photo = body.photo;
      const user = await db.getUserByEmail(email);
      if (user.length) {
        cb('User already exists!');
      } else {
        let response = await db.addUser(email, password, firstname, lastname, bio, role, location, race, photo);
        cb(null, 'Success');
      }
    }
  ));
}
