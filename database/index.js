const config = require('./config.js');
const mysql = require('mysql');

const knex = require('knex')({
  client: 'mysql',
  connection: config.mySql
});

// Adds users to db if does not exist
const addUser = async (username, email, password) => {
  const existingUser = await knex.select()
    .from('users')
    .where(knex.raw(`LOWER(username) = LOWER('${username}')`));

  if (existingUser.length) {
    console.log('user exists');
    return 'User already exists! :(';
  } else {
    console.log('user added');
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

const findUserById = (id) => {
  return knex('users').where('user_id', id);
}

// Create game
const createGame = async (game) => {
  console.log('game', game)
  return await knex('games')
    .insert({
      room_id: game.room,
      player1: 1, // ?? game.playerOne TODO: update player 1 from hard coded
      player2: 2, // ?? game.playerTwo TODO: update player 2 from hard coded
      current_player: 1 // ?? currently game.currentPlayer is string TODO: update from hard coded
    });
    // await game.board.map(hex => {
    //   createHex(hex, game.gameIndex);
    // })
}

// Create hex
const createHex = async (hex, gameIndex) => {
  return await knex('hex')
    .insert({
      game_id: gameIndex, // TODO: Check gameIndex matches one on server
      player: 1, // TODO: Update from hardcoded to user ID from user obj
      units: hex.units,
      has_resource: hex.hasResource
    })
}

// Delete game after certain amount of time has passed
const deleteGame = () => {
  const date = new Date();
  // if certain amount of time has passed
  // search for all games in the db
    // select those games
    // delete those games
}

// If game has completed, update game to completed
const gameComplete = () => {
  // if game has completed
    // Update user wins
    // Update user losses
}

// Update player on hex if player moves to hex
const updateHexUser = () => {
  // find hex user is currently on
  // find hex user is moving to
  // update original hex to remove the user
  // update new hex to add the user to that hex
}

// Increase units
const increaseUnits = () => {
  // find hex with the resource
  // find the hex with the current user
    // add 10 to the units
}

// Decrease units
const decreaseUnits = () => {

}

module.exports = {
  addUser,
  checkUserCreds,
  createGame,
  createHex,
  deleteGame,
  gameComplete,
  updateHexUser,
  increaseUnits,
  decreaseUnits,
  findUserById
}