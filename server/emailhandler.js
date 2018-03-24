const nodemailer = require('nodemailer');
const config = require('./config/emailconfig.js');

const sendEmail = (username, email, room, message) => {
  const template = `<h1>Hexology: The Hex Game That Runs In Your Browser</h1>
<h3>Hello ${email}!</h3>
<p>Your friend, who goes by ${username}, wants you to join a game of Hexology. Click the link below to get started, and be sure to sign in!</p>
<p><a href="hexology-game/herokuapp.com/game/${room}">Join the game!</a></p>`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.EMAIL,
      pass: config.EMAIL_PASSWORD
    }
  });

  let mailOptions = {
    from: '"Hexbot" <hexbotmailer@gmail.com>',
    to: email,
    subject: `${username} wants you to join a game of Hexology!`,
    text: `Hello ${email}! Your friend, who goes by ${username}, wants you to join a game of Hexology. Click this link to get started, and be sure to sign in: hexology-game.herokuapp.com/game/${room}`,
    html: message ? `${message} <a href="hexology-game/herokuapp.com/game/${room}">Join the game!</a>` : template
  }

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error(err);
    console.log(`Invitation sent by ${username}: ${info}`);
  })
}

module.exports = {
  sendEmail
}
