const nodemailer = require('nodemailer');
import { EMAIL, EMAIL_PASSWORD } from '../config/emailconfig.js';

const template = `<h1>Hexology: The Hex Game That Runs In Your Browser</h1>
<h3>Hello ${email}!</h3>
<p>Your friend, who goes by ${username}, wants you to join a game of Hexology. Click the link below to get started, and be sure to sign in!</p>
<p><a href="hexolog-game/herokuapp.com/game/${room}">Join the game!</a></p>`;

const sendEmail = (username, email, room) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: EMAIL,
      password: EMAIL_PASSWORD
    }
  });

  let mailOptions = {
    from: '"Hexbot" <hexbotmailer@gmail.com>',
    to: email,
    subject: `${username} wants you to join a game of Hexology!`,
    text: `Hello ${email}! Your friend, who goes by ${username}, wants you to join a game of Hexology. Click this link to get started, and be sure to sign in: hexology-game.herokuapp.com/game/${room}`,
    html: template
  }

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error(err);
    console.log(`Invitation sent by ${username}: ${info.messagedId}`);
  })
}
