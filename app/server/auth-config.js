const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
const saltRounds = 10;
let db = require('../database/index.js');
let bodyParser = require('body-parser');

module.exports = function (passport) {
  passport.serializeUser(function (user, done) { // creating sessions
    done(null, user);
  });

  passport.deserializeUser(async (user, done) => { 
    // const userProfile = await db.findUserById(user);
    // console.log('deserializedUser:', userProfile);
    done(null, user);
  });

  // LOCAL LOGIN STRATEGY
  passport.use('local-login', new LocalStrategy({
    passReqToCallback: true
  },
    async (req, username, password, cb) => {
      const userInfo = await db.checkUserCreds(username);
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
    passReqToCallback: true,
  },
    async (req, username, password, cb) => {
      bcrypt.hash(password, 10, async (err, hash) => {
        if (err) {
          cb(err, null)
        } else {
          const user = await db.addUser(username, req.body.email, hash);
          if (user === 'User already exists') {
            cb(user, null);
          } else {
            let userData = await db.checkUserCreds(username);
            cb(null, userData)
          }
        }
      })
    }
  ));
}
