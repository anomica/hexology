const config = require('../config.js');
const mysql = require('mysql');
const moment = require('moment');

const knex = require('knex')({
  client: 'mysql',
  connection: config.mySql
});

/////////////////////// Adds users to db if does not exist ///////////////////////
const addUser = async (username, email, password) => {
  const existingUser = await knex.select()
    .from('users')
    .where(knex.raw(`LOWER(username) = LOWER('${username}') OR LOWER(email) = LOWER('${email}')`));

  if (existingUser.length) { // checks if username or email already exists
    // console.log('user exists');
    return 'User already exists'; // must return this exact string for passport recognition
  } else {
    return await knex('users') // insert user into the db
    .insert({
      username: username,
      email: email,
      password: password
    })
  }
}

/////////////////////// Checks user credentials ///////////////////////
const checkUserCreds = (username) => {
  return knex.select()
    .from('users')
    .where(knex.raw(`LOWER(username) = LOWER('${username}')`));
}

/////////////////////// Get user id from user table /////////////////
const getUserId = async (username, currentPlayer) => {
  if (username === 'anonymous' && currentPlayer === 'player1') {
    return [{ user_id: 1 }]; // anonymous user as player1 has a user_id in the db of 1
  } else if (username === 'anonymous' && currentPlayer === 'player2') {
    return [{ user_id: 2 }]; // anonymous user as player2 has a user_id in the db of 2
  } else { // user is not anon
    return await knex.select()
      .from('users')
      .where(knex.raw(`LOWER(username) = LOWER('${username}')`))
  }
}

/////////////////////// Returns current player as 'player1' or 'player2' ///////////////////////
const getUserPlayer = async (gameIndex, username) => {
  let player = await getUserId(username); // to get user id
  let game = await getGame(null, gameIndex); // to get the game

  if (game[0].player1 === player[0].user_id) { // check whether user id matches as player 1 in game
    return 'player1';
  } else if (game[0].player2 === player[0].user_id) { // or as player2
    return 'player2';
  }
}

/////////////////////// Get either player1 or player2 username ///////////////////////
const getPlayerUsername = async (currentPlayer, gameIndex, room) => {
  // console.log(`\ngetPlayerUsername function: currentPlayer (${currentPlayer}), gameIndex (${gameIndex}), room (${room})\n`)
  let game = await getGame(room, gameIndex); // get current game from games table
  let playerId = game[0][currentPlayer]; // get the player id from the game
  return await knex.select()
    .from('users')
    .where(knex.raw(`${playerId} = user_id`))
}

/////////////////////// Fetches user by id ///////////////////////
const findUserById = (id) => {
  return knex('users')
    .select('user_id', 'username', 'email', 'wins', 'losses')
    .where(knex.raw(`${id} = user_id`))
}

/////////////////////// Saves new game ///////////////////////
const createGame = (room, board, gameIndex) => {
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  return knex('games')
    .insert({
      game_index: gameIndex,
      room_id: roomNum,
      player1: 1, // defaults to 1 (will be set to the actual user id after both players have joined) // TODO: refactor later so it all happens here
      player2: 2, // defaults to 2 (will be set to the actual user id after both players have joined) // TODO: refactor later so it all happens here
      current_player: 1 // defaults to 1 (will be set to the actual user id after both players have joined) // TODO: refactor later so it all happens here
    })
    .returning(`game_id`)
    .then(gameId => {
      board.map(hex => {
        createHex(hex, gameId);
      });
    });
}

/////////////////////// Create board (hexes) for the new game ///////////////////////
const createHex = async (hex, gameId) => {
  let playerOnHex = await hex.player ? hex.player[hex.player.length - 1] : null; // TODO: update with user id
  // console.log('\nthis is the player on the hex:\n', playerOnHex)
  return await knex('hex')
    .insert({
      hex_index: hex.index,
      game_id: gameId,
      coordinate_0: hex.coordinates[0],
      coordinate_1: hex.coordinates[1],
      coordinate_2: hex.coordinates[2],
      player: playerOnHex,
      hex_owner: playerOnHex,
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
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  return await knex
    .column(knex.raw(`hex.*`))
    .select()
    .from(knex.raw(`hex, games`))
    .where(knex.raw(`${roomNum} = games.room_id AND '${gameIndex}' = game_index AND hex.game_id = games.game_id`));
}

/////////////////////// Switch players after current player makes a move ///////////////////////
const switchPlayers = async (gameIndex, currentPlayer) => {
  if (currentPlayer === 'player1') { // if the current player who just made a move is player 1
    await knex('games')
      .where(knex.raw(`'${gameIndex}' = game_index`))
      .update('current_player', 2) // switch to player 2
  } else if (currentPlayer === 'player2') { // else vice versa
    await knex('games')
      .where(knex.raw(`'${gameIndex}' = game_index`))
      .update('current_player', 1)
  }
}

/////////////////////// Update origin hex & new hex when player moves ///////////////////////
const updateDbHexes = async (masterOrigin, updatedTarget, currentPlayer, updatedOrigin) => {
  // console.log('\nupdateDbHexes function in db:\n', '\n\nmasterOrigin:\n', masterOrigin, '\n\nupdatedTarget:\n', updatedTarget, '\n\ncurrentPlayer: ',currentPlayer, '\n\nUpdatedOrigin:\n', updatedOrigin)
  let playerId = await currentPlayer[currentPlayer.length - 1];
  if (updatedOrigin.swordsmen === 0 && updatedOrigin.archers === 0 && updatedOrigin.knights === 0) { // if all units were moved from original hex, remove player as owner & remove units from hex
    await knex('hex')
      .where(knex.raw(`'${masterOrigin[0].hex_index}' = hex_index`))
      .update({
        player: null,
        hex_owner: null,
        swordsmen: 0,
        archers: 0,
        knights: 0
      })
  } else { // else update original hex with units left behind by player
    await knex('hex')
      .where(knex.raw(`${playerId} = player AND '${masterOrigin[0].hex_index}' = hex_index`))
      .update({
        swordsmen: updatedOrigin.swordsmen,
        archers: updatedOrigin.archers,
        knights: updatedOrigin.knights
      })
      .then(data => { // then update the hex owner
        updateHexOwner(masterOrigin[0].hex_index, playerId);
      })
  }

  // Updates new hex that the player has moved to with current player & units
  await knex('hex')
    .where(knex.raw(`'${updatedTarget.index}' = hex_index`))
    .update({
      player: playerId, // moves the current player to the new hex
      hex_owner: playerId, // current player also now owns the hex
      swordsmen: updatedTarget.swordsmen, // updates the new hex with the player's units
      archers: updatedTarget.archers,
      knights: updatedTarget.knights
    })

  let updatedTargetHexIndex; // Fetches the new target hex
  updatedTargetHexIndex = updatedTarget.index !== undefined ? updatedTarget.index : updatedTarget.hex_index;

  let targetHex = await getHex(updatedTargetHexIndex); // NOTE: This returns an object

  // Updates gold resource for the new origin hex
  if (targetHex[0].has_gold) { // if the new origin hex has gold
    if (playerId === '1') { // and if current player is player 1
      return await knex('games')
        .where(knex.raw(`${targetHex[0].game_id} = game_id`))
        .increment('p1_gold', 10) // increases p1 gold by 10
        .then(data => {
          removeHexResource(targetHex[0].hex_index, 'gold'); // removes resource from hex
        })
    } else if (playerId === '2') { // else if current player is player 2
      return await knex('games')
        .where(knex.raw(`${targetHex[0].game_id} = game_id`))
        .increment('p2_gold', 10) // increases p2 gold by 10
        .then(data => {
          removeHexResource(targetHex[0].hex_index, 'gold'); // removes resource from hex
        })
    }
  }
  // Updates wood resource for the new origin hex
  if (targetHex[0].has_wood) { // if the new origin hex has wood
    if (playerId === '1') { // and if current player is player 1
      return await knex('games')
        .where(knex.raw(`${targetHex[0].game_id} = game_id`))
        .increment('p1_wood', 10) // increases p1 wood by 10
        .then(data => {
          removeHexResource(targetHex[0].hex_index, 'wood'); // removes resource from hex
        })
    } else if (playerId === '2') { // else if current player is player 2
      return await knex('games')
        .where(knex.raw(`${targetHex[0].game_id} = game_id`))
        .increment('p2_wood', 10) // increases p2 wood by 10
        .then(data => {
          removeHexResource(targetHex[0].hex_index, 'wood'); // removes resource from hex
        })
    }
  }

  // Updates metal resource for the new origin hex
  if (targetHex[0].has_metal) { // if the new origin hex has metal
    if (playerId === '1') { // and if current player is player 1
      return await knex('games')
        .where(knex.raw(`${targetHex[0].game_id} = game_id`))
        .increment('p1_metal', 10) // increases p1 metal by 10
        .then(data => {
          removeHexResource(targetHex[0].hex_index, 'metal'); // removes resource from hex
        })
    } else if (playerId === '2') { // else if current player is player 2
      return await knex('games')
        .where(knex.raw(`${targetHex[0].game_id} = game_id`))
        .increment('p2_metal', 10) // increases p2 metal by 10
        .then(data => {
          removeHexResource(targetHex[0].hex_index, 'metal'); // removes resource from hex
        })
    }
  }
}

const updateHexOwner = async (hexIndex, player) => { // update hex owner (on a move only) NOTE: Player comes in as string
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

/////////////////////// Updates the units on the hex upon combat ///////////////////////
const updateHexUnits = async (hexIndex, swordsmen, archers, knights, currentPlayer) => {
  // console.log('\n...INSIDE UPDATE HEX UNITS FUNCTION IN DB...\n')
  // console.log(`\nhexIndex ${hexIndex}, swordsmen ${swordsmen}, archers ${archers}, knights ${knights}, currentPlayer ${currentPlayer}\n`);
  let playerId = null;

  // FIXME: fix where current player is coming in as 'playernull'
  if (currentPlayer !== 'playernull' && currentPlayer !== null) { // if current player exists from server req
    playerId = await currentPlayer[currentPlayer.length - 1];
    await knex('hex')
      .where(knex.raw(`'${hexIndex}' = hex_index AND ${Number(playerId)} = player`))
      .update({
        swordsmen: swordsmen,
        archers: archers,
        knights: knights
      })
  } else { // if player needs to be removed
    await knex('hex')
      .where(knex.raw(`'${hexIndex}' = hex_index`))
      .update({
        player: null,
        swordsmen: swordsmen,
        archers: archers,
        knights: knights
      })
  }
}

/////////////////////// Gets bank totals for the specified player from game ///////////////////////
const getPlayerBank = async (room, gameIndex, currentPlayer) => {
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  if (currentPlayer === 'player1') {
    return await knex('games')
      .select('p1_swordsmen_bank', 'p1_archers_bank', 'p1_knights_bank')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
  } else if (currentPlayer === 'player2') {
    return await knex('games')
      .select('p2_swordsmen_bank', 'p2_archers_bank', 'p2_knights_bank')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
  }
}

/////////////////////// Gets total units on the board for the specified player from game ///////////////////////
const getPlayerTotalUnits = async (room, gameIndex, currentPlayer) => {
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  if (currentPlayer === 'player1') {
    return await knex('games')
      .select('p1_total_units')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
  } else if (currentPlayer === 'player2') {
    return await knex('games')
      .select('p2_total_units')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
  }
}

/////////////////////// Increases the player bank in game upon purchase ///////////////////////
const increasePlayerBank = async (room, gameIndex, currentPlayer, type, quantity) => {
  // console.log(`increasePlayerBank function in database: room (${room}), gameIndex (${gameIndex}), currentPlayer (${currentPlayer}), type (${type}), quantity (${quantity})`);
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  if (currentPlayer === 'player1') {
    if (type === 'swordsmen') {
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .increment('p1_swordsmen_bank', quantity)
    }
    if (type === 'archers') {
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .increment('p1_archers_bank', quantity)
    }
    if (type === 'knights') {
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .increment('p1_knights_bank', quantity)
    }
  } else if (currentPlayer === 'player2') {
    if (type === 'swordsmen') {
      await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .increment('p2_swordsmen_bank', quantity)
    }
    if (type === 'archers') {
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .increment('p2_archers_bank', quantity)
    }
    if (type === 'knights') {
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .increment('p2_knights_bank', quantity)
    }
  }
}

//////////////// Updates a player's total units in game //////////////////
const updatePlayerTotalUnits = async (room, gameIndex, currentPlayer, quantity, action) => { // action will be 'increase' or 'replace' or 'decrease'
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  if (currentPlayer === 'player1') { // if player 1
    if (action === 'increase') { // if adding to player's total units
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .increment('p1_total_units', quantity) // increases the player's units by the quantity
    } else if (action === 'decrease') { // if subtracting units from the player's total units
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .decrement('p1_total_units', quantity) // decreases the player's units by the quantity
    } else if (action === 'replace') { // replace total units
      // console.log('\nREPLACING units from PLAYER 1 total units in the game..\n');
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .update('p1_total_units', quantity) // replaces the player's units by the quantity
    }
  } else if (currentPlayer === 'player2') { // else if player 2
    if (action === 'increase') { // if adding to player's total units
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .increment('p2_total_units', quantity) // increases the player's units by the quantity
    } else if (action === 'decrease') { // if subtracting units from the player's total units
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .decrement('p2_total_units', quantity) // decreases the player's units by the quantity
    } else if (action === 'replace') { // replace total units
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .update('p2_total_units', quantity) // replaces the player's units by the quantity
    }
  }
}

////////////////// Deploy units from player bank to hex //////////////////
const deployUnits = async (room, hexIndex, gameIndex, type, quantity, currentPlayer) => {
  let gameId = await getGame(room, gameIndex); // get game id
  await knex('hex')
    .where(knex.raw(`'${gameId[0].game_id}' = game_id AND '${hexIndex}' = hex_index`))
    .increment(type, quantity)
}

/////////////////////// Decreases the player bank upon deploying units ///////////////////////
const decreasePlayerBank = async (room, gameIndex, currentPlayer, type, quantity) => {
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  if (currentPlayer === 'player1') { // if decreasing bank for player 1
    if (type === 'swordsmen') { // if type is swordsmen for player 1
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p1_swordsmen_bank', quantity)
    }
    if (type === 'archers') { // if type is archers for player 1
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p1_archers_bank', quantity)
    }
    if (type === 'knights') { // if type is knights for player 1
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p1_knights_bank', quantity)
    }
  } else if (currentPlayer === 'player2') { // if decreasing bank for player 2
    if (type === 'swordsmen') { // if type is swordsmen for player 2
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p2_swordsmen_bank', quantity)
    }
    if (type === 'archers') { // if type is archers for player 2
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p2_archers_bank', quantity)
    }
    if (type === 'knights') { // if type is knights for player 2
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p2_knights_bank', quantity)
    }
  }
}

/////////////////////// Switches player/owner of hex during combat /////////////////////
const switchHexOwner = async (hexIndex, updatedOwner) => {
  let ownerId = null;
  if (updatedOwner) { // if there is an owner to be updated
    ownerId = await updatedOwner[updatedOwner.length - 1];
    await knex('hex')
      .where(knex.raw(`'${hexIndex}' = hex_index`))
      .update({
        player: ownerId,
        hex_owner: ownerId
      })
  } else { // else if updating to no owner
    await knex('hex')
      .where(knex.raw(`'${hexIndex}' = hex_index`))
      .update({
        hex_owner: null,
        player: null
      })
  }
}

/////////////////////// Removes resource from the hex ///////////////////////
const removeHexResource = async (hexIndex, resource) => {
  if (resource === 'gold') {
    await knex('hex')
      .where(knex.raw(`'${hexIndex}' = hex_index`))
      .update({has_gold: 0})
  }
  if (resource === 'wood') {
    await knex('hex')
      .where(knex.raw(`'${hexIndex}' = hex_index`))
      .update({has_wood: 0})
  }
  if (resource === 'metal') {
    await knex('hex')
      .where(knex.raw(`'${hexIndex}' = hex_index`))
      .update({has_metal: 0})
  }
}

/////////////////////// Gets user resources from game ///////////////////////
const getResources = async (room, gameIndex, currentPlayer) => {
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  if (currentPlayer === 'player1') {
    return await knex('games')
      .select('p1_gold', 'p1_wood', 'p1_metal')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
  } else if (currentPlayer === 'player2') {
    return await knex('games')
      .select('p2_gold', 'p2_wood', 'p2_metal')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
  }
}

/////////////////////// Updates user resources & units upon purchases ///////////////////////
const buySwordsmen = async (room, gameIndex, currentPlayer) => {
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  if (currentPlayer === 'player1') {
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_gold', 10) // decreases the player's gold - 10
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_metal', 10) // decreases the player's metal - 10
  } else if (currentPlayer === 'player2') {
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_gold', 10) // decreases the player's gold - 10
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_metal', 10) // decreases the player's metal - 10
  }
};

const buyArchers = async (room, gameIndex, currentPlayer) => {
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  if (currentPlayer === 'player1') {
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_gold', 10) // decreases the player's gold - 10
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_wood', 20) // decreases the player's wood - 20
  } else if (currentPlayer === 'player2') {
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_gold', 10) // decreases the player's gold - 10
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_wood', 20) // decreases the player's wood - 20
  }
};

const buyKnights = async (room, gameIndex, currentPlayer) => {
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  if (currentPlayer === 'player1') {
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_gold', 20) // decreases the player's gold - 20
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_wood', 20) // decreases the player's wood - 20
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_metal', 20) // decreases the player's metal - 20
  } else if (currentPlayer === 'player2') {
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
};

/////////////////////// Gets hex based off hex index ///////////////////////
const getHex = (hexIndex) => { // NOTE: This will return an OBJECT
  return knex('hex').select()
    .where(knex.raw(`'${hexIndex}' = hex_index`))
}

/////////////////////// Get the current player on the hex ///////////////////////
const getCurrentPlayerHex = async (gameId, currentPlayer) => {
  if (currentPlayer === 'player1') {
    return await knex('hex')
      .where(knex.raw(`${gameId} = game_id AND 1 = player`));
  } else if (currentPlayer === 'player2') {
    return await knex('hex')
      .where(knex.raw(`${gameId} = game_id AND 2 = player`));
  }
}

/////////////////////// Deletes hexes if game has ended ///////////////////////
const deleteHex = async (gameId) => {
  await knex('hex')
    .where(knex.raw(`${gameId} = game_id`))
    .del()
}

/////////////////////// Updates game to completed once done ///////////////////////
const gameComplete = async (gameIndex, room, winner, loser) => {
  // console.log(`\ngameComplete: gameIndex (${gameIndex}), room (${room}), winner (${winner}), loser (${loser})`)
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  let game = await getGame(room, gameIndex);
  if ((winner === 'player1') && (game[0].player1 !== 1)) { // if the winner is player1 & is not anon
    await knex('users')
      .where(knex.raw(`user_id = ${game[0].player1}`))
      .increment('wins', 1) // increase wins
    if (game[0].player2 !== 2) { // if player2 is not anonymous (id of 2 = anon in db) 
      await knex('users') // if the winner is player1 & is not anonymous
      .where(knex.raw(`user_id = ${game[0].player2}`))
      .increment('losses', 1) // increase losses
    }
  } else if ((winner === 'player2') && (game[0].player2 !== 2)) { // if the winner is player2 & is not anon
    await knex('users')
      .where(knex.raw(`user_id = ${game[0].player2}`))
      .increment('wins', 1) // increase wins
    if (game[0].player1 !== 1) { // if player1 is not anonymous (id of 1 = anon in db) 
      await knex('users')
        .where(knex.raw(`user_id = ${game[0].player1}`))
        .increment('losses', 1) // increase losses
    }
  }
  
  await deleteHex(game[0].game_id); // first delete the hexes (foreign key restraint)
  await knex('games') // then delete the game
    .where(knex.raw(`${game[0].game_id} = game_id`))
    .del()
}

/////////////////////// Retrieves game based off room and/or game index ///////////////////////
const getGame = async (room, gameIndex) => {
  // console.log(`\nINSIDE GET GAME: room (${room}), gameIndex (${gameIndex})`)
  let roomNum;
  if (room && gameIndex) { // if room && game index are provided
    // console.log(`\nROOM & GAME INDEX AVAILABLE: (${room}), gameIndex (${gameIndex})`)
    roomNum = room.includes('*') ? room.split('*').join('') : room;
    return await knex('games').select()
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`));
  }
  if (gameIndex) { // if only game index is available
    // console.log(`\nONLY GAME INDEX AVAILABLE: gameIndex (${gameIndex})`)
    return await knex('games').select()
      .where(knex.raw(`'${gameIndex}' = game_index`));
  }
  if (room) { // if only room is available
    // console.log(`\nONLY ROOM AVAILABLE: room (${room})`)
    roomNum = room.includes('*') ? room.split('*').join('') : room;
    return await knex('games').select()
      .where(knex.raw(`${roomNum} = room_id`))
      .returning('game_id')
  }  
  if (gameIndex === undefined && room === null) {
    console.log('error in getting the game from database');
  }
}

/////////////////////// Deletes game when a player leaves the room ///////////////////////
const forceEndGame = async (gameIndex, saveGame) => {
  // console.log('\nforce ending the game... gameIndex: ', gameIndex, '\n');
  if (saveGame !== 'saveOnly') { // if only passing in the gameindex, then the game needs to be ended
    let game = await getGame(null, gameIndex);
    if (game.length > 0) {
      await deleteHex(game[0].game_id); // first delete the hexes
      await knex('games') // then delete the game
        .where(knex.raw(`${game[0].game_id} = game_id`))
        .del();
    }
  } else { // else the game is being saved, do nothing!
    return;
  }
}

/////////////////////// Sets players for the game ///////////////////////
const setGamePlayers = async (username, currentPlayer, gameIndex, room) => {
  // console.log(`\nsetGamePlayers in db: username (${username}), currentPlayer (${currentPlayer}), gameIndex (${gameIndex}), room (${room})\n`);
  let roomNum = room.includes('*') ? room.split('*').join('') : room;
  let gameId = await getGame(room, gameIndex);

  let gameBoard = await getGameBoard(room, gameIndex);
  let playerOneHex = gameBoard[0];
  let playerTwoHex = gameBoard[gameBoard.length - 1];

  let playerOne;
  let playerTwo;

  if (username === 'anonymous') {
    if (currentPlayer === 'player2') {
      playerTwo = [{user_id: 2}];
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .update('player2', 2) // anon player2 user id is automatically set to 2 in db
      return;
    } else if (currentPlayer === 'player1') {
      playerOne = [{user_id: 1}];
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .update('player1', 1) // anon player1 user id is automatically set to 1 in db
      return;
    }
  } else {
    if (currentPlayer === 'player2') {
      playerTwo = await getUserId(username, 'player2'); // returns an object
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .update('player2', playerTwo[0].user_id)
    } else if (currentPlayer === 'player1') {
      playerOne = await getUserId(username, 'player1'); // returns an object

      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .update('player1', playerOne[0].user_id)
    }
  }
}

/////////////////////// Gets all users from db who are not anon ///////////////////////
const getUsernames = async () => {
  return await knex('users')
    .select(knex.raw(`username, wins, losses, email`))
    .whereNot(knex.raw(`username = 'anonymous'`))
    .orderByRaw(`wins DESC`)
}

/////////////////////// Updates the room number once a game is resumed ///////////////////////
const updateRoomNum = async (gameIndex, newRoom) => {
  let roomNum = newRoom.includes('*') ? newRoom.split('*').join('') : newRoom; // roomNum result will be a string
  await knex('games')
    .where(knex.raw(`'${gameIndex}' = game_index`))
    .update('room_id', Number(roomNum))
}

/////////////////////// Get the other user's info (email and what not) ///////////////////////
const getOtherUserStuff = async (gameIndex, username) => { // username = current user
  // console.log(`\ngetOtherUserStuff = gameIndex (${gameIndex}), username (${username})\n`);
  let user = await getUserId(username);
  let game = await getGame(null, gameIndex);
  if (user[0].user_id === game[0].player1) { // if current player is player1
    return knex.column(knex.raw(`users.user_id, users.username, users.email`)) // then get player2's info
      .from(knex.raw(`games, users`))
      .where(knex.raw(`games.game_index = '${gameIndex}' AND games.player2 = users.user_id`))
  } else if (user[0].user_id === game[0].player2) { // if current player is player2
    return knex.column(knex.raw(`users.user_id, users.username, users.email`)) // then get player1's info
      .from(knex.raw(`games, users`))
      .where(knex.raw(`games.game_index = '${gameIndex}' AND games.player1 = users.user_id`))
  }
}

/////////////////////// Deletes game if > 1 day has passed ///////////////////////
const deleteOldGames = async (gameId) => {
  let today = await moment(new Date()).format('YYYY-MM-DD 23:59:59');
  let yesterday = await moment(new Date()).subtract(1, 'days').format('YYYY-MM-DD 00:00:00');
  let oldGames = await knex.column(knex.raw(`games.created_at, games.game_id, hex.*`))
    .from(knex.raw(`games, hex`))
    .where(knex.raw(`games.created_at NOT BETWEEN '${yesterday}' AND '${today}'`))
    .andWhere(knex.raw(`games.game_id = hex.game_id`))
    .orderByRaw(`games.created_at DESC`)  
  if (oldGames.length > 0) {
    return Promise.all(oldGames.forEach(async (hex, i, oldGames) => {
      await deleteHex(hex.game_id); // delete the hexes
      await knex('games') // then delete the game
        .where(knex.raw(`${hex.game_id} = game_id`))
        .del()
      console.log(`Games older than ${today} and ${yesterday} have been deleted`);
    }));
  } else {
    console.log('No old games to be deleted')
    return;
  }
}

/////////////////////// When a user deletes an existing game from their current games list ///////////////////////
const deleteUserGame = async (gameId) => {
  await deleteHex(gameId); // first delete the hexes
  await knex('games') // then delete the game
    .where(knex.raw(`${gameId} = game_id`))
    .del();
}

/////////////////////// Gets user's existing games ///////////////////////
const retrieveUserGames = async (username) => {
   let currentUser = await getUserId(username);
   const games = await knex.column(knex.raw(`games.*, users.username as 'player2_username'`))
   .select()
   .from(knex.raw(`games, users`))
   .whereNot(knex.raw(`games.player2 = 2`)) // where player2 is not anonymous
   .andWhereNot(knex.raw(`games.player1 = 1`)) // where player1 is not anonymous
   .andWhere(knex.raw(`
     ( ${currentUser[0].user_id} = games.player2
       OR ${currentUser[0].user_id} = games.player1 )
     AND LOWER('${username}') = LOWER(users.username
   )`)) // where current user is player1 or player2 and username matches current user
   .orderByRaw(`games.created_at DESC`);
  
  return Promise.all(games.map(async (game, i, games) => {
    if (game.player1 === currentUser[0].user_id) { // if current user is player1
      let otherUser = await knex.select()
        .from('users')
        .where(knex.raw(`${game.player2} = user_id`));
      game.player2_username = otherUser[0].username;
      game.player1_username = currentUser[0].username;
      return game;

    } else if (game.player2 === currentUser[0].user_id) { // if current user is player2
      let otherUser = await knex.select()
        .from('users')
        .where(knex.raw(`${game.player1} = user_id`));
      game.player1_username = otherUser[0].username;
      game.player2_username = currentUser[0].username;
      return game;
    }
 }));
}

module.exports = {
  addUser,
  checkUserCreds,
  getUserId,
  findUserById,
  createGame,
  createHex,
  getGameBoard,
  updateDbHexes,
  getHex,
  getGame,
  deleteOldGames,
  deleteHex,
  gameComplete,
  getResources,
  buySwordsmen,
  buyArchers,
  buyKnights,
  updateHexUnits,
  switchHexOwner,
  getPlayerTotalUnits,
  increasePlayerBank,
  deployUnits,
  decreasePlayerBank,
  getPlayerBank,
  updatePlayerTotalUnits,
  setGamePlayers,
  forceEndGame,
  getUsernames,
  retrieveUserGames,
  getPlayerUsername,
  switchPlayers,
  updateRoomNum,
  getUserPlayer,
  getOtherUserStuff,
  removeHexResource,
  deleteUserGame
};