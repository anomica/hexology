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

// Saves new game to the db
const createGame = (room, board, gameIndex) => {
  let roomNum = room.split('*').join(''); // removes '*' from room since room is INT
  return knex('games')
    .insert({
      game_index: gameIndex,
      room_id: roomNum,
      player1: 1, // TODO: update to user id eventually
      player2: 2, // TODO: update to user id eventually
      current_player: 1 // TODO: update from hard coded eventually
    })
    .returning('game_id')
    .then(gameId => {
      board.map(hex => {
        createHex(hex, gameId);
      });
    });
}

// Create hexes for a new game
const createHex = async (hex, gameId) => {
  let playerOnHex = await hex.player ? hex.player[hex.player.length - 1] : null; //TODO: update with user id eventually

  return await knex('hex')
    .insert({
      hex_index: hex.index,
      game_id: gameId,
      coordinate_0: hex.coordinates[0],
      coordinate_1: hex.coordinates[1],
      coordinate_2: hex.coordinates[2],
      player: playerOnHex,
      has_gold: hex.hasGold,
      has_wood: hex.hasWood,
      has_metal: hex.hasMetal,
      swordsmen: hex.swordsmen,
      archers: hex.archers,
      knights: hex.knights
    })
}

// Fetches the game board (hexes) from the db
const getGameBoard = (room, gameIndex) => {
  let roomNum = room.split('*').join('');

  return knex
    .column(knex.raw(`hex.*`))
    .select()
    .from(knex.raw(`hex, games`))
    .where(knex.raw(`${roomNum} = games.room_id AND '${gameIndex}' = game_index AND hex.game_id = games.game_id`));
}

// Update origin hex and new hex when player moves
const updateDbHexes = async (originalOrigin, newOrigin, currentPlayer) => {
  let playerId = await currentPlayer[currentPlayer.length - 1]; // TODO: need to update with user id... eventually

  // Updates original hex
  await knex('hex')
    .where(knex.raw(`${playerId} = player AND '${originalOrigin.hex_index}' = hex_index`))
    .update({
      player: null, // removes the player from the origin hex
      swordsmen: 0,
      archers: 0,
      knights: 0
      //TODO:
      // has_gold: , 
      // has_wood: ,
      // has_metal: ,
    })

  // Updates new hex that the player has moved to
  await knex('hex')
    .where(knex.raw(`'${newOrigin.index}' = hex_index`))
    .update({
      player: playerId, // moves the current player to the new hex
      swordsmen: originalOrigin.swordsmen, // updates the new hex with the player's units
      archers: originalOrigin.archers,
      knights: originalOrigin.knights
    })
}

// // Update resources in db
// const updateResources = (room, gameIndex, currentPlayer) => {
//   let playerId = await currentPlayer[currentPlayer.length - 1]; // TODO: will need to update player id eventually
//   let roomNum = room.split('*').join('');

//   return knex('games')
//     .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id AND ${playerId} = player`))
//     .update({
//       // p
//     })
// }

// Fetches a game from the db
const getGame = (room, gameIndex) => {
  let roomNum = room.split('*').join('');
  return knex('games').where(
    knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`)
  );
}

// Fetches games that are more than one day old from today's date
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
    .where(knex.raw(`room_id = ${game.room} AND game_index = ${game.gameIndex}`))
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
  updateDbHexes,
  findUserById,
  increaseUnits,
  getOldGames,
  deleteHex,
  getGame,
  getGameBoard
};