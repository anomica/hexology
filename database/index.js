const config = require('./config.js');
const mysql = require('mysql');
const moment = require('moment');
const bcrypt = require('bcrypt');

const knex = require('knex')({
  client: 'mysql',
  connection: config.mySql
});

/////////////////////// Adds users to db if does not exist ///////////////////////
const addUser = async (username, email, password) => {
  const existingUser = await knex.select()
    .from('users')
    .where(knex.raw(`LOWER(username) = LOWER('${username}')`));

  if (existingUser.length) { // checks if user already exists in the db
    // console.log('user exists');
    return 'User already exists! :(';
  } else {
    bcrypt.hash(password, 10, (err, hash) => { // hash the pw
      if (err) {
        console.error('Error in hashing password: ', err);
      } else {
        console.log('----------------- database added user: ')
        console.log('user added: ', username, '\npassword: ', password, '\nhash: ', hash);
        insertNewUser(username, email, hash); // inserts user with hashed pw in the db
      }
    })
  }
}

const insertNewUser = async (username, email, hash) => {
  // console.log('=========== insert new user ==========');
  return await knex('users') // insert user into the db
    .insert({
      username: username,
      email: email,
      password: hash
    });
}

/////////////////////// Checks user credentials ///////////////////////
const checkUserCreds = (username) => {
  return knex.select()
    .from('users')
    .where(knex.raw(`LOWER(username) = LOWER('${username}')`));
}

/////////////////////// Fetches user by id ///////////////////////
const findUserById = (id) => {
  return knex('users').where('user_id', id);
}

/////////////////////// Saves new game ///////////////////////
const createGame = (room, board, gameIndex) => {
  let roomNum = room.split('*').join(''); // removes '*' from room since room is INT
  return knex('games')
    .insert({
      game_index: gameIndex,
      room_id: roomNum,
      player1: 1, // TODO: update to user id eventually
      player2: 2, // TODO: update to user id eventually
      current_player: 1 // TODO: update to user id eventually
    })
    .returning('game_id')
    .then(gameId => {
      board.map(hex => {
        createHex(hex, gameId);
      });
    });
}

/////////////////////// Create board (hexes) for the new game ///////////////////////
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

/////////////////////// Fetches the game board (hexes) ///////////////////////
const getGameBoard = async (room, gameIndex) => {
  let roomNum = await room.split('*').join('');

  // console.log('---------- get game board -> ROOM: ', room);
  // console.log('---------- get game board -> GAME INDEX: ', gameIndex);

  return await knex
    .column(knex.raw(`hex.*`))
    .select()
    .from(knex.raw(`hex, games`))
    .where(knex.raw(`${roomNum} = games.room_id AND '${gameIndex}' = game_index AND hex.game_id = games.game_id`));
}

/////////////////////// Update origin hex & new hex when player moves ///////////////////////
const updateDbHexes = async (originalOrigin, newOrigin, currentPlayer, updatedOrigin) => {
  let playerId = await currentPlayer[currentPlayer.length - 1]; // TODO: update with user id... eventually

  // Updates original hex to no player and no units
  await knex('hex')
    .where(knex.raw(`${playerId} = player AND '${originalOrigin.hex_index}' = hex_index`))
    .update({
      player: null, // removes the player from the origin hex
      swordsmen: updatedOrigin.swordsmen,
      archers: updatedOrigin.archers,
      knights: updatedOrigin.knights
    })

  // Updates new hex that the player has moved to with current player & units
  await knex('hex')
    .where(knex.raw(`'${newOrigin.index}' = hex_index`))
    .update({
      player: playerId, // moves the current player to the new hex
      swordsmen: newOrigin.swordsmen, // updates the new hex with the player's units
      archers: newOrigin.archers,
      knights: newOrigin.knights
    })

  // console.log('+++++++++++++++ new hex has gold: +++++++++++++++', newOrigin);

  // Fetches the new origin hex
  let dbHex = await getHex(newOrigin.index);

  // console.log('_____________ new origin index ____________', newOrigin.index);

  // console.log('-------- db hex --------- ', dbHex);

  // Updates gold resource for the new origin hex
  if (dbHex[0].has_gold) { // if the new origin hex has gold

    // console.log('+++++++++++++++ hex has GOLD: +++++++++++++++', dbHex);
    // console.log('player id: ', playerId, 'length', playerId.length, typeof playerId);

    if (playerId === '1') { // and if current player is player 1 TODO: update with user id eventually
      // console.log('@@@@@@@@@@@@@@ player 1 has the GOLD @@@@@@@@@@@@@@');
      return await knex('games')
        .where(knex.raw(`${dbHex[0].game_id} = game_id`))
        .increment('p1_gold', 10) // increases p1 gold by 10
        .then(data => {
          removeHasGold(dbHex[0].hex_index); // removes resource from hex
        })
    } else if (playerId === '2') { // else if current player is player 2 TODO: update with user id eventually
      // console.log('@@@@@@@@@@@@@@  player 2 has the GOLD @@@@@@@@@@@@@@');
      return await knex('games')
        .where(knex.raw(`${dbHex[0].game_id} = game_id`))
        .increment('p2_gold', 10) // increases p2 gold by 10
        .then(data => {
          removeHasGold(dbHex[0].hex_index); // removes resource from hex
        })
    }
  }

  // Updates wood resource for the new origin hex
  if (dbHex[0].has_wood) { // if the new origin hex has wood

    // console.log('+++++++++++++++ hex has WOOD: +++++++++++++++', dbHex);
    // console.log('player id: ', playerId, 'length', playerId.length, typeof playerId);

    if (playerId === '1') { // and if current player is player 1 TODO: update with user id eventually
      // console.log('@@@@@@@@@@@@@@ player 1 has the WOOD @@@@@@@@@@@@@@');
      return await knex('games')
        .where(knex.raw(`${dbHex[0].game_id} = game_id`))
        .increment('p1_wood', 10) // increases p1 wood by 10
        .then(data => {
          removeHasWood(dbHex[0].hex_index); // removes resource from hex
        })
    } else if (playerId === '2') { // else if current player is player 2 TODO: update with user id eventually
      // console.log('@@@@@@@@@@@@@@  player 2 has the WOOD @@@@@@@@@@@@@@');
      return await knex('games')
        .where(knex.raw(`${dbHex[0].game_id} = game_id`))
        .increment('p2_wood', 10) // increases p2 wood by 10
        .then(data => {
          removeHasWood(dbHex[0].hex_index); // removes resource from hex
        })
    }  
  }

  // Updates metal resource for the new origin hex
  if (dbHex[0].has_metal) { // if the new origin hex has metal

    // console.log('+++++++++++++++ hex has METAL: +++++++++++++++', dbHex);
    // console.log('player id: ', playerId, 'length', playerId.length, typeof playerId);

    if (playerId === '1') { // and if current player is player 1 TODO: update with user id eventually
      // console.log('@@@@@@@@@@@@@@ player 1 has the METAL @@@@@@@@@@@@@@');
      return await knex('games')
        .where(knex.raw(`${dbHex[0].game_id} = game_id`))
        .increment('p1_metal', 10) // increases p1 metal by 10
        .then(data => {
          removeHasMetal(dbHex[0].hex_index); // removes resource from hex
        })
    } else if (playerId === '2') { // else if current player is player 2 TODO: update with user id eventually
      // console.log('@@@@@@@@@@@@@@  player 2 has the METAL @@@@@@@@@@@@@@');
      return await knex('games')
        .where(knex.raw(`${dbHex[0].game_id} = game_id`))
        .increment('p2_metal', 10) // increases p2 metal by 10
        .then(data => {
          removeHasMetal(dbHex[0].hex_index); // removes resource from hex
        })
    }  
  }
}

/////////////////////// Removes resource from the hex ///////////////////////
const removeHasGold = async (hexIndex) => {
  return await knex('hex').select()
    .where(knex.raw(`'${hexIndex}' = hex_index`))
    .update({has_gold: 0})
}

const removeHasWood = async (hexIndex) => {
  return await knex('hex').select()
    .where(knex.raw(`'${hexIndex}' = hex_index`))
    .update({has_wood: 0})
}

const removeHasMetal = async (hexIndex) => {
  return await knex('hex').select()
    .where(knex.raw(`'${hexIndex}' = hex_index`))
    .update({has_metal: 0})
}

/////////////////////// Gets user resources from game ///////////////////////
const getResources = async (room, gameIndex, currentPlayer) => {
  // console.log('_____________ inside get resources _____________');
  let player = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let roomNum = await room.split('*').join('');

  if (player === '1') { // TODO: update with player id
    return await knex('games')
      .select('p1_gold', 'p1_wood', 'p1_metal')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))

  } else if (player === '2') { // TODO: update with player id
    return await knex('games')
      .select('p2_gold', 'p2_wood', 'p2_metal')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
  }
}

/////////////////////// Updates user resources & units upon purchases ///////////////////////
const buySwordsmen = async (room, gameIndex, currentPlayer) => {
  let player = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let roomNum = await room.split('*').join('');
  let gameId = await getGameId(room, gameIndex); // gets the game id to find find the current game and hex the player is on

  // console.log('++++++++++++++++ game id', gameId);

  if (player === '1') { //TODO: update with player id
    console.log('>>>>>>>>>>>>>> player 1 buying SWORDSMEN');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_gold', 10) // decreases the player's gold - 10

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_metal', 10) // decreases the player's metal - 10

  } else if (player === '2') { //TODO: update with player id
    console.log('>>>>>>>>>>>>>> player 2 buying SWORDSMEN');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_gold', 10) // decreases the player's gold - 10

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_metal', 10) // decreases the player's metal - 10
  }

  // then find hex that the current player is on
  await knex('hex')
    .where(knex.raw(`${player} = player AND ${gameId[0].game_id} = game_id`))
    .increment('swordsmen', 10) // increases the units on the player's hex + 10
};

const buyArchers = async (room, gameIndex, currentPlayer) => {
  let player = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let roomNum = await room.split('*').join('');
  let gameId = await getGameId(room, gameIndex); // gets the game id to find find the current game and hex the player is on

  if (player === '1') { //TODO: update with player id
    console.log('>>>>>>>>>>>>>> player 1 buying ARCHERS');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_gold', 10) // decreases the player's gold - 10

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_wood', 20) // decreases the player's wood - 20

  } else if (player === '2') { //TODO: update with player id
    console.log('>>>>>>>>>>>>>> player 2 buying ARCHERS');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_gold', 10) // decreases the player's gold - 10

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_wood', 20) // decreases the player's wood - 20
  }

  // then find hex that the current player is on
  await knex('hex')
    .where(knex.raw(`${player} = player AND ${gameId[0].game_id} = game_id`))
    .increment('archers', 10) // increases the units on the player's hex + 10
};

const buyKnights = async (room, gameIndex, currentPlayer) => {
  let player = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let roomNum = await room.split('*').join('');
  let gameId = await getGameId(room, gameIndex); // gets the game id to find find the current game and hex the player is on

  if (player === '1') { //TODO: update with player id
    console.log('>>>>>>>>>>>>>> player 1 buying KNIGHTS');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_gold', 20) // decreases the player's gold - 20

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_wood', 20) // decreases the player's wood - 20

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_metal', 20) // decreases the player's metal - 20

  } else if (player === '2') { //TODO: update with player id
    console.log('>>>>>>>>>>>>>> player 2 buying KNIGHTS');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_gold', 20) // decreases the player's gold - 20

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_wood', 20) // decreases the player's wood - 20

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_metal', 20) // decreases the player's metal - 20
  }

  // then find hex that the current player is on
  await knex('hex')
    .where(knex.raw(`${player} = player AND ${gameId[0].game_id} = game_id`))
    .increment('knights', 10) // increases the units on the player's hex + 10
};

/////////////////////// Gets hex based off hex index ///////////////////////
const getHex = (hexIndex) => {
  return knex('hex').select()
    .where(knex.raw(`'${hexIndex}' = hex_index`))
}

/////////////////////// Retrieves game based off room and game index ///////////////////////
const getGame = (room, gameIndex) => {
  let roomNum = room.split('*').join('');
  return knex('games').where(
    knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`)
  );
}

/////////////////////// Gets game ID based off room and game index ///////////////////////
const getGameId = (room, gameIndex) => {
  let roomNum = room.split('*').join('');
  return knex('games')
    .select('game_id')
    .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`));
}

/////////////////////// Fetches games older than 1 day from today's date ///////////////////////
const getOldGames = async () => {
  let today = await moment(new Date()).format('YYYY-MM-DD 23:59:59');
  let yesterday = await moment(new Date()).subtract(1, 'days').format('YYYY-MM-DD 00:00:00');

  return await knex('games').select()
    .where(knex.raw(`created_at NOT BETWEEN '${yesterday}' AND '${today}'`))
    .returning('game_id')
}

/////////////////////// Marks game as completed if > 1 day has passed ///////////////////////
const deleteGames = async (gameId) => {
  return await knex('games')
    .where(knex.raw(`${gameId} = game_id`))
    .update(`game_completed`, 1)
    // .del();
}

/////////////////////// Marks hexes with remove flag = true if game deleted ///////////////////////
const deleteHex = (gameId) => {
  // console.log('IN DELETE HEX', gameId);
  return knex('hex')
    .where(`game_id`, gameId)
    .update('remove_hex', 1)
}

// TODO: THIS
/////////////////////// Updates game to completed once done ///////////////////////
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

module.exports = {
  addUser,
  checkUserCreds,
  insertNewUser,
  findUserById,
  createGame,
  createHex,
  getGameBoard,
  updateDbHexes,
  removeHasGold,
  removeHasWood,
  removeHasMetal,
  getHex,
  getGame,
  getOldGames,
  deleteGames,
  deleteHex,
  gameComplete,
  getResources,
  buySwordsmen,
  buyArchers,
  buyKnights
};