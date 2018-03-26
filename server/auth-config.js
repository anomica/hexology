const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
const saltRounds = 10;
let db = require('../database/index.js');
let bodyParser = require('body-parser');

module.exports = function (passport) {
  passport.serializeUser(function (user, done) { // creating sessions
    console.log('serializingUser');
    done(null, user);
  });

  passport.deserializeUser(async (user, done) => { // what actually gets passed in here as user?
    console.log('user from passport.deserializedUser:', user);
    // const userProfile = await db.findUserById(user);
    // console.log('deserializedUser:', userProfile);
    done(null, user);
  });

  // LOCAL LOGIN STRATEGY
  passport.use('local-login', new LocalStrategy({
    passReqToCallback: true
  },
    async (req, username, password, cb) => {
      console.log('req.body, username, password:', req.body, username, password);
      const userInfo = await db.checkUserCreds(username);
      console.log('userInfo:', userInfo);
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
      // console.log('woooooo')
      // console.log('req', req.body);
      // console.log('username:', username);
      // console.log('password:', password);
      // console.log('cb:', cb);

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
