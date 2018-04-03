const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const saltRounds = 10;
let db = require('./db/index.js');
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
        cb(null, user);
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
      console.log('made it to passport local-signup', username, password);
      console.log('made it to else');
      const user = await db.addUser(username, req.body.email, hash);
      console.log('user:', user);
        if (user === 'User already exists') {
          cb(user, null);
        } else {
          let userData = await db.checkUserCreds(username);
          console.log('in else')
          cb(null, userData)
        }
    })
  );
}
