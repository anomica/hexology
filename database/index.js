// const config = require('./config.js');
// const mysql = require('mysql');
const bcrypt = require('bcrypt');
let knex;

// const knex = require('knex')({
//   client: 'mysql',
//   connection: config.mySql
// });

knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  ssl: true
})

// Adds users to db if does not exist
const addUser = async (req, username, email, password) => {
  const existingUser = await knex.select()
    .from('users')
    .where(knex.raw(`LOWER(username) = LOWER('${username}')`));

  if (existingUser.length) {
    return 'User already exists! :(';
  } else {
    return knex('users')
      .insert({
        username: username,
        email: email,
        password: password
      });
  }
}

// Checks user credentials
const checkUserCreds = (username) => {
  return knex.select()
    .from('users')
    .where(knex.raw(`LOWER(username) = LOWER('${username}')`));
}

// Create game
// const createGame = async (game) => {
//   return await knex('games')
//     .insert({
//       room_id: game.room_id,
//       player1: game_player1,
//       player2: game.player2,
//       current_player: game.player1
//     });
//   // Create hexes
//   await knex('hex')
//     .insert({
//       game_id:
//       player:
//       units:
//       has_resource:
//     })
// }
// Delete game after certain amount of time has passed
// If game has completed, update game to completed
  // Update user wins
  // Update user losses
// Update player on hex if player moves to hex
// Increase units
// Decrease units


module.exports = {
  addUser,
  checkUserCreds
}
