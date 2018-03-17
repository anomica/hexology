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
    const userProfile = await db.findUserById(user);
    console.log('deserializedUser:', userProfile);
    done(null, userProfile[0]);
  });

  // LOCAL LOGIN STRATEGY
  passport.use('local-login', new LocalStrategy( 
    async (username, password, cb) => {
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
      console.log('woooooo')
      console.log('req', req.body);
      console.log('username:', username);
      console.log('password:', password);
      console.log('cb:', cb);
      let response = await db.addUser(username, req.body.email, password);
      console.log('response:', response);
      cb(null, response[0]);
    }
  ));
}
