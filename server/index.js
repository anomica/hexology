const express = require('express');
const bodyParser = require('body-parser');
const url = require('url');
const db = require('../database/index');
const passport = require('passport');
const session = require('express-session');

const app = express();
// require('../server/config/passport')(passport);
app.use(session({
  secret: process.env.SESSION_PASSWORD || 'supersecretsecret',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/../app'));
app.use(express.static(__dirname + '/../node_modules'));

app.use(bodyParser.json());

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).end('You must log in to do that!');
}

app.get('*', (req, res) => res.redirect('/'));

app.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});
