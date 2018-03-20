const config = require('./config.js');
const mysql = require('mysql');
const moment = require('moment');

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

// Saves new game to the database
const createGame = (room, board, gameIndex) => {
  let roomNum = room.split('*').join(''); // removes '*' from room
  return knex('games')
    .insert({
      game_index: gameIndex,
      room_id: roomNum,
      player1: 1, // TODO: update player 1 from hard coded
      player2: 2, // TODO: update player 2 from hard coded
      current_player: 1 // TODO: update from hard coded
    })
    .returning('game_id')
    .then(gameId => {
      board.map(hex => {
        createHex(hex, gameId);
      });
    });
}

const getGame = (room, gameIndex) => {
  let roomNum = room.split('*').join('');
  return knex('games')
    .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
}

const getHexes = (room, gameIndex) => {
  let roomNum = room.split('*').join('');

  return knex
    .column(knex.raw(`hex.*`))
    .select()
    .from(knex.raw(`hex, games`))
    .where(knex.raw(`${roomNum} = games.room_id AND '${gameIndex}' = game_index AND hex.game_id = games.game_id`));
}

// Create hexes for a new game
const createHex = async (hex, gameId) => {
  let playerOnHex = await hex.player ? hex.player[hex.player.length - 1] : null;

  return await knex('hex')
    .insert({
      hex_index: hex.index,
      game_id: gameId,
      player: playerOnHex,
      units: hex.units,
      has_resource: hex.hasResource
    })
}

const getOldGames = async () => {
  let today = await moment(new Date()).format('YYYY-MM-DD 23:59:59');
  let yesterday = await moment(new Date()).subtract(1, 'days').format('YYYY-MM-DD 00:00:00');

  return await knex('games').select()
    .where(knex.raw(`created_at NOT BETWEEN '${yesterday}' AND '${today}'`))
    .returning('game_id')
}

// Marks game as completed if more than one day has passed
const deleteGames = async (gameId) => {
  return await knex('games')
    .where(knex.raw(`${gameId} = game_id`))
    .update(`game_completed`, 1)
    // .del();
}

// Marks hexes with remove flag set to true if game is deleted
const deleteHex = (gameId) => {
  // console.log('IN DELETE HEX', gameId);
  return knex('hex')
    .where(`game_id`, gameId)
    .update('remove_hex', 1)
}

// TODO: THIS
// Updates game to 'completed' status upon game completion
const gameComplete = async (game) => {
  console.log('DATABASE ---> Game Complete'); //TODO: take out console log
  await knex('games')
    .where(`room_id`, game.room) // TODO: check game ID
    .update(`game_completed`, 1)

  let winner = game.playerOne; // TODO: update with winner id
  let loser = game.playerTwo; // TODO: update with loser id
  
  // Updates user table for the winner
  await knex('users')
    .where(`room_id = ${game.room} and user_id =${winner}`)
    .increment(`wins`, 1)

  // Updates user table for the loser
  await knex('users')
    .where(`room_id = ${game.room} and user_id =${loser}`)
    .increment(`losses`, 1)
}

// Update origin hex and new hex when player moves
const updateHex = async (oldOrigin, updatedOrigin, newOrigin) => {
  let currentPlayer = await oldOrigin.player[oldOrigin.player.length - 1];

  await knex('hex')
    .where(knex.raw(`${currentPlayer} = player AND '${oldOrigin.index}' = hex_index`))
    .update({
      player: null,
      has_resource: updatedOrigin.hasResource,
      units: updatedOrigin.units
    })

  await knex('hex')
    .where(knex.raw(`'${newOrigin.index}' = hex_index`))
    .update({
      player: currentPlayer,
      has_resource: 0,
      units: oldOrigin.units
    })
}

// Increases the user's units
const increaseUnits = async (hex) => {
  // console.log('DATABASE: INSIDE INCREASE UNITS');
  return await knex('hex')
    .where(knex.raw(`'${hex.index}' = hex_index`))
    .update('units', hex.units)
}

module.exports = {
  addUser,
  checkUserCreds,
  createGame,
  createHex,
  deleteGames,
  gameComplete,
  updateHex,
  findUserById,
  increaseUnits,
  getOldGames,
  deleteHex,
  getGame,
  getHexes
};