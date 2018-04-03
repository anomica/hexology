const express = require('express');
const bodyParser = require('body-parser');
const url = require('url');
let path = require('path');
const db = require('../db/index');
const passport = require('passport');
const session = require('express-session');
const uuidv4 = require('uuid/v4');
const app = express();
const http = require("http");
const server = http.createServer(app);
var cors = require('cors');
require('../auth-config.js')(passport);
require('events').EventEmitter.prototype._maxListeners = 100;
// const http = require('http').Server(app);
// require('../server/config/passport')(passport);
app.use(session({
  secret: process.env.SESSION_PASSWORD || 'supersecretsecret',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '../react-client/dist')));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());
app.use(cors())

console.log('auth server');

// local Login Strategy
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).end('You must log in to do that!');
}

app.get('/persistUser', (req, res) => {
  res.send(req.user);
});

app.post('/signup', passport.authenticate('local-signup'), (req, res) => {
  console.log('in auth signup');
  res.status(201).json(req.user);
});

app.post('/login', passport.authenticate('local-login'), (req, res) => {
  console.log('in auth login')
  res.status(201).json(req.user);
});

app.post('/logout', isLoggedIn, function (req, res) {
  req.logout();
  res.clearCookie('connect.sid').status(200).redirect('/');
});



server.listen(process.env.PORT || 8000, '0.0.0.0', function () {
  console.log('listening on port 8000!');
});

