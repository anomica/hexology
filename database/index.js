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

  return await knex
    .column(knex.raw(`hex.*`))
    .select()
    .from(knex.raw(`hex, games`))
    .where(knex.raw(`${roomNum} = games.room_id AND '${gameIndex}' = game_index AND hex.game_id = games.game_id`));
}

/////////////////////// Update origin hex & new hex when player moves ///////////////////////
const updateDbHexes = async (originalOrigin, newOrigin, currentPlayer, updatedOrigin) => {
  let playerId = await currentPlayer[currentPlayer.length - 1]; // TODO: update with user id eventually

  // Updates original hex
  if (updatedOrigin.swordsmen === 0 && updatedOrigin.archers === 0 && updatedOrigin.knights === 0) { // if all units were moved, remove player as owner & remove units from hex
    await knex('hex')
      .where(knex.raw(`${playerId} = player AND '${originalOrigin[0].hex_index}' = hex_index`))
      .update({
        player: null,
        hex_owner: null,
        swordsmen: 0,
        archers: 0,
        knights: 0
      })
  } else { // else update origin hex with units left behind by player
    await knex('hex')
      .where(knex.raw(`${playerId} = player AND '${originalOrigin[0].hex_index}' = hex_index`))
      .update({
        swordsmen: updatedOrigin.swordsmen,
        archers: updatedOrigin.archers,
        knights: updatedOrigin.knights
      })
      .then(data => { // then update the hex owner
        updateHexOwner(originalOrigin[0].hex_index, playerId);
      })
  }

  // Updates new hex that the player has moved to with current player & units
  await knex('hex')
    .where(knex.raw(`'${newOrigin.index}' = hex_index`))
    .update({
      player: playerId, // moves the current player to the new hex
      hex_owner: playerId, // current player also now owns the hex
      swordsmen: newOrigin.swordsmen, // updates the new hex with the player's units
      archers: newOrigin.archers,
      knights: newOrigin.knights
    })

  // Fetches the new origin hex
  let dbHex = await getHex(newOrigin.index); // NOTE: This returns an object

  // Updates gold resource for the new origin hex
  if (dbHex[0].has_gold) { // if the new origin hex has gold
    if (playerId === '1') { // and if current player is player 1 TODO: update with user id eventually
      return await knex('games')
        .where(knex.raw(`${dbHex[0].game_id} = game_id`))
        .increment('p1_gold', 10) // increases p1 gold by 10
        .then(data => {
          removeHasGold(dbHex[0].hex_index); // removes resource from hex
        })
    } else if (playerId === '2') { // else if current player is player 2 TODO: update with user id eventually
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
    if (playerId === '1') { // and if current player is player 1 TODO: update with user id eventually
      return await knex('games')
        .where(knex.raw(`${dbHex[0].game_id} = game_id`))
        .increment('p1_wood', 10) // increases p1 wood by 10
        .then(data => {
          removeHasWood(dbHex[0].hex_index); // removes resource from hex
        })
    } else if (playerId === '2') { // else if current player is player 2 TODO: update with user id eventually
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
    if (playerId === '1') { // and if current player is player 1 TODO: update with user id eventually
      return await knex('games')
        .where(knex.raw(`${dbHex[0].game_id} = game_id`))
        .increment('p1_metal', 10) // increases p1 metal by 10
        .then(data => {
          removeHasMetal(dbHex[0].hex_index); // removes resource from hex
        })
    } else if (playerId === '2') { // else if current player is player 2 TODO: update with user id eventually
      return await knex('games')
        .where(knex.raw(`${dbHex[0].game_id} = game_id`))
        .increment('p2_metal', 10) // increases p2 metal by 10
        .then(data => {
          removeHasMetal(dbHex[0].hex_index); // removes resource from hex
        })
    }  
  }
}

const updateHexOwner = async (hexIndex, player) => { // NOTE: Player comes in as string
  let hex = await getHex(hexIndex);

  // check if the original hex user was on has units on it
  if ((hex[0].swordsmen > 0 || hex[0].archers > 0 || hex[0].knights > 0) && (Number(player) === hex[0].player)) { // set current player as owner of hex & removes player as current player
    await knex('hex')
      .where(knex.raw(`'${hexIndex}' = hex_index`))
      .update({
        hex_owner: player,
        player: null
      })
  } else { // else set the current player & owner on hex to null
    await knex('hex')
      .where(knex.raw(`'${hexIndex}' = hex_index`))
      .update({
        hex_owner: null,
        player: null
      }) 
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
  let gameId = await getGameId(room, gameIndex); // gets the game id to find find the current game and hex the player is on (NOTE: This returns an object)

  if (player === '1') { //TODO: update with player id
    // console.log('>>>>>>>>>>>>>> player 1 buying SWORDSMEN');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_gold', 10) // decreases the player's gold - 10

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_metal', 10) // decreases the player's metal - 10

  } else if (player === '2') { //TODO: update with player id
    // console.log('>>>>>>>>>>>>>> player 2 buying SWORDSMEN');
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
  let gameId = await getGameId(room, gameIndex); // gets the game id to find find the current game and hex the player is on (NOTE: This returns an object)

  if (player === '1') { //TODO: update with player id
    // console.log('>>>>>>>>>>>>>> player 1 buying ARCHERS');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_gold', 10) // decreases the player's gold - 10

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_wood', 20) // decreases the player's wood - 20

  } else if (player === '2') { //TODO: update with player id
    // console.log('>>>>>>>>>>>>>> player 2 buying ARCHERS');
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
  let gameId = await getGameId(room, gameIndex); // gets the game id to find find the current game and hex the player is on (NOTE: This returns an object)

  if (player === '1') { //TODO: update with player id
    // console.log('>>>>>>>>>>>>>> player 1 buying KNIGHTS');
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
    // console.log('>>>>>>>>>>>>>> player 2 buying KNIGHTS');
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
const getHex = (hexIndex) => { // NOTE: This will return an OBJECT
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
const getGameId = (room, gameIndex) => { // NOTE: This returns an object
  let roomNum = room.split('*').join('');
  return knex('games')
    .select('game_id')
    .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
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
    // .del(); // TODO: make this work
}

/////////////////////// Marks hexes with remove flag = true if game deleted ///////////////////////
const deleteHex = (gameId) => {
  return knex('hex')
    .where(`game_id`, gameId)
    .update('remove_hex', 1)
}

/////////////////////// Updates game to completed once done ///////////////////////
const gameComplete = async (gameIndex, room, winner, loser) => {
  // console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ DATABASE ---> Game Complete');

  let roomNum = room.split('*').join('');

  await knex('games')
    .where(knex.raw(`room_id = ${roomNum} AND game_index = '${gameIndex}'`))
    .update(`game_completed`, 1)
  // console.log('++++++++++++++++++++++++++++++++++++++ GAME STATUS UPDATED TO COMPLETED')

  // Updates wins for the winner in the user table
  await knex('users')
    .where(knex.raw(`user_id = ${winner}`))
    .increment(`wins`, 1)
  // console.log('-------------------------------------- WINNER UPDATED')

  // Updates losses for the loser in the user tabl
  await knex('users') 
    .where(knex.raw(`user_id = ${loser}`))
    .increment(`losses`, 1)
  // console.log('?????????????????????????????????????? LOSER UPDATED')

  let gameId = await getGameId(room, gameIndex); // returns an object with game_id
  await deleteHex(gameId[0].game_id); // marks hexes to be deleted
  // console.log('===================================== HEXES MARKED AS COMPLETED')
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