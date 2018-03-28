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
    return 'User already exists';
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
const getUserId = async (username) => { // anonymous user will return user id of 1
  return await knex.select()
    .from('users')
    .where(knex.raw(`LOWER(username) = LOWER('${username}')`))
}

/////////////////////// Get either player1 or player2 username ///////////////////////
const getPlayerUsername = async (currentPlayer, gameIndex, room) => {
  // console.log(`\ngetPlayerUsername function: currentPlayer (${currentPlayer}), gameIndex (${gameIndex}), room (${room})\n`)

  let game = await getGame(room, gameIndex); // get current game from games table
  let playerId = game[0][currentPlayer]; // get the player id from the game object

  return await knex.select('username')
    .from('users')
    .where(knex.raw(`${playerId} = user_id`))
}

/////////////////////// Fetches user by id ///////////////////////
const findUserById = (id) => {
  return knex('users')
    .select('user_id', 'username', 'email', 'wins', 'losses')
    .where('user_id', id);
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
  let newOriginHex;

  if (newOrigin.index !== undefined) {
    newOriginHex = await newOrigin.index;
  } else {
    newOriginHex = await newOrigin.hex_index;
  }

  let dbHex = await getHex(newOriginHex); // NOTE: This returns an object

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
  // console.log('gold updated in db')

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
  // console.log('wood updated in db')

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
  // console.log('metal updated in db')
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
    playerId = await currentPlayer[currentPlayer.length - 1]; // TODO: update with user id eventually
    await knex('hex')
      .where(knex.raw(`'${hexIndex}' = hex_index AND ${Number(playerId)} = player`))
      .update({
        swordsmen: swordsmen,
        archers: archers,
        knights: knights
      })
  } else { // if player from server needs to be removed
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
  let player = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let roomNum = await room.split('*').join('');

  if (player === '1') {
    // console.log('\ngetting player 1 bank');
    return await knex('games')
      .select('p1_swordsmen_bank', 'p1_archers_bank', 'p1_knights_bank')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))

  } else if (player === '2') {
    // console.log('\ngetting player 2 bank');
    return await knex('games')
      .select('p2_swordsmen_bank', 'p2_archers_bank', 'p2_knights_bank')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
  }
}

/////////////////////// Gets total units on the board for the specified player from game ///////////////////////
const getPlayerTotalUnits = async (room, gameIndex, currentPlayer) => {
  let player = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let roomNum = await room.split('*').join('');

  if (player === '1') {
    // console.log('\ngetting player 1 total units\n');
    return await knex('games')
      .select('p1_total_units')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))

  } else if (player === '2') {
    // console.log('\ngetting player 2 total units\n');
    return await knex('games')
      .select('p2_total_units')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
  }
}

/////////////////////// Increases the player bank in game upon purchase ///////////////////////
const increasePlayerBank = async (room, gameIndex, currentPlayer, type, quantity) => {
  // console.log(`increasePlayerBank function in database: room (${room}), gameIndex (${gameIndex}), currentPlayer (${currentPlayer}), type (${type}), quantity (${quantity})`);

  let player = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let roomNum = await room.split('*').join('');

  if (player === '1') {
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
  } else if (player === '2') {
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
  let playerId = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let roomNum = await room.split('*').join('');

  // console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\ninside updating players total units in the db...\n');

  if (playerId === '1') { // if player 1
    if (action === 'increase') { // if adding to player's total units
      // console.log('\nADDDING units to PLAYER 1 total units in the game...\n');
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .increment('p1_total_units', quantity) // increases the player's units by the quantity

    } else if (action === 'decrease') { // if subtracting units from the player's total units
      // console.log('\nSUBTRACTING units from PLAYER 1 total units in the game...\n');
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .decrement('p1_total_units', quantity) // decreases the player's units by the quantity

    } else if (action === 'replace') { // replace total units
      // console.log('\nREPLACING units from PLAYER 1 total units in the game..\n');
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .update('p1_total_units', quantity) // replaces the player's units by the quantity
    }

  } else if (playerId === '2') { // else if player 2

    if (action === 'increase') { // if adding to player's total units
      // console.log('\nADDING units to PLAYER 2 total units in the game...\n');
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .increment('p2_total_units', quantity) // increases the player's units by the quantity

    } else if (action === 'decrease') { // if subtracting units from the player's total units
      // console.log('\nSUBTRACTING units from PLAYER 2 total units in the game...\n');
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .decrement('p2_total_units', quantity) // decreases the player's units by the quantity

    } else if (action === 'replace') { // replace total units
      // console.log('\nREPLACING units from PLAYER 1 total units in the game..\n');
      await knex('games')
        .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
        .update('p2_total_units', quantity) // replaces the player's units by the quantity
    }
  }
  // console.log('\ntotal units for player has been updated in the db...\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

////////////////// Deploy units from player bank to hex & decrease bank in game //////////////////
const deployUnits = async (room, hexIndex, gameIndex, type, quantity, currentPlayer) => {
  let player = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let gameId = await getGameId(room, gameIndex); // get game id

  if (player === '1') { // if player 1 is deploying units
    if (type === 'swordsmen') { // if player 1 is deploying SWORDSMEN
      await knex('hex')
        .where(knex.raw(`'${gameId[0].game_id}' = game_id AND '${hexIndex}' = hex_index`))
        .increment('swordsmen', quantity) // increase SWORDSMEN on hex by quantity
    }
    
    if (type === 'archers') { // if player 1 is deploying ARCHERS
      await knex('hex')
        .where(knex.raw(`'${gameId[0].game_id}' = game_id AND '${hexIndex}' = hex_index`))
        .increment('archers', quantity) // increase ARCHERS on hex by quantity
    }

    if (type === 'knights') { // if player 1 is deploying KNIGHTS
      await knex('hex')
        .where(knex.raw(`'${gameId[0].game_id}' = game_id AND '${hexIndex}' = hex_index`))
        .increment('knights', quantity) // increase KNIGHTS on hex by quantity
    }
  } else if (player === '2') { // if player 2 is deploying units
    if (type === 'swordsmen') { // if player 2 is deploying SWORDSMEN
      await knex('hex')
        .where(knex.raw(`'${gameId[0].game_id}' = game_id AND '${hexIndex}' = hex_index`))
        .increment('swordsmen', quantity) // increase SWORDSMEN on hex by quantity
    }
    
    if (type === 'archers') { // if player 2 is deploying ARCHERS
      await knex('hex')
        .where(knex.raw(`'${gameId[0].game_id}' = game_id AND '${hexIndex}' = hex_index`))
        .increment('archers', quantity) // increase ARCHERS on hex by quantity
    }

    if (type === 'knights') { // if player 2 is deploying KNIGHTS
      await knex('hex')
        .where(knex.raw(`'${gameId[0].game_id}' = game_id AND '${hexIndex}' = hex_index`))
        .increment('knights', quantity) // increase KNIGHTS on hex by quantity
    }
  }
}

/////////////////////// Decreases the player bank upon deploying units ///////////////////////
const decreasePlayerBank = async (room, gameIndex, currentPlayer, type, quantity) => {
  // console.log('\n----------------------------------------------------------------------------\nDECREASING BANK IN GAME\n----------------------------------------------------------------------------\n')

  let player = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let roomNum = await room.split('*').join('');

  if (player === '1') { // if decreasing bank for player 1
    if (type === 'swordsmen') { // if type is swordsmen for player 1
      // console.log('\n----------------------------------------------------------------------------\nDECREASING PLAYER 1 SWORDSMEN BANK IN GAME\n----------------------------------------------------------------------------\n')
      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p1_swordsmen_bank', quantity)
    }
    if (type === 'archers') { // if type is archers for player 1
      // console.log('\n----------------------------------------------------------------------------\nDECREASING PLAYER 1 ARCHERS BANK IN GAME\n----------------------------------------------------------------------------\n')

      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p1_archers_bank', quantity)
    }
    if (type === 'knights') { // if type is knights for player 1
      // console.log('\n----------------------------------------------------------------------------\nDECREASING PLAYER 1 KNIGHTS BANK IN GAME\n----------------------------------------------------------------------------\n')

      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p1_knights_bank', quantity)
    }
  } else if (player === '2') { // if decreasing bank for player 2
    if (type === 'swordsmen') { // if type is swordsmen for player 2
      // console.log('\n----------------------------------------------------------------------------\nDECREASING PLAYER 2 SWORDSMEN BANK IN GAME\n----------------------------------------------------------------------------\n')

      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p2_swordsmen_bank', quantity)
    }
    if (type === 'archers') { // if type is archers for player 2
      // console.log('\n----------------------------------------------------------------------------\nDECREASING PLAYER 2 ARCHERS BANK IN GAME\n----------------------------------------------------------------------------\n')

      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p2_archers_bank', quantity)
    }
    if (type === 'knights') { // if type is knights for player 2
      // console.log('\n----------------------------------------------------------------------------\nDECREASING PLAYER 2 KNIGHTS BANK IN GAME\n----------------------------------------------------------------------------\n')

      await knex('games')
        .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
        .decrement('p1_knights_bank', quantity)
    }
  }
}

/////////////////////// Switches player/owner of hex during combat /////////////////////
const switchHexOwner = async (hexIndex, updatedOwner) => {
  let ownerId = null;

  if (updatedOwner) { // if there is an owner to be updated
    // console.log('\nupdating hex owner and player to new player in db\n')
    ownerId = await updatedOwner[updatedOwner.length - 1]; // update with the owner id
    await knex('hex')
      .where(knex.raw(`'${hexIndex}' = hex_index`))
      .update({
        player: ownerId,
        hex_owner: ownerId
      })
  } else { // else if updating to no owner
    // console.log('\nupdating hex owner and player to null in db\n')
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
    // console.log('\n>>>>>>>>>>>>>> player 1 buying SWORDSMEN IN THE -- DB --');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_gold', 10) // decreases the player's gold - 10

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_metal', 10) // decreases the player's metal - 10

  } else if (player === '2') { //TODO: update with player id
    // console.log('\n>>>>>>>>>>>>>> player 2 buying SWORDSMEN IN THE -- DB --');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_gold', 10) // decreases the player's gold - 10

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_metal', 10) // decreases the player's metal - 10
  }
};

const buyArchers = async (room, gameIndex, currentPlayer) => {
  let player = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let roomNum = await room.split('*').join('');
  let gameId = await getGameId(room, gameIndex); // gets the game id to find find the current game and hex the player is on (NOTE: This returns an object)

  if (player === '1') { //TODO: update with player id
    // console.log('\n>>>>>>>>>>>>>> player 1 buying ARCHERS IN THE -- DB --');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_gold', 10) // decreases the player's gold - 10

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p1_wood', 20) // decreases the player's wood - 20

  } else if (player === '2') { //TODO: update with player id
    // console.log('\n>>>>>>>>>>>>>> player 2 buying ARCHERS IN THE -- DB --');
    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_gold', 10) // decreases the player's gold - 10

    await knex('games')
      .where(knex.raw(`${roomNum} = room_id AND '${gameIndex}' = game_index`))
      .decrement('p2_wood', 20) // decreases the player's wood - 20
  }
};

const buyKnights = async (room, gameIndex, currentPlayer) => {
  let player = await currentPlayer[currentPlayer.length - 1]; // TODO: update with player id
  let roomNum = await room.split('*').join('');
  let gameId = await getGameId(room, gameIndex); // gets the game id to find find the current game and hex the player is on (NOTE: This returns an object)

  if (player === '1') { //TODO: update with player id
    // console.log('\n>>>>>>>>>>>>>> player 1 buying KNIGHTS IN THE -- DB --');
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
    // console.log('\n>>>>>>>>>>>>>> player 2 buying KNIGHTS IN THE -- DB --');
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
  // console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ DATABASE ---> Game Complete');
  // console.log(`\ngameComplete: gameIndex (${gameIndex}), room (${room}), winner (${winner}), loser (${loser})`)
  let roomNum = await room.split('*').join('');
  let game = await getGame(room, gameIndex);

  // console.log('gameeeeeeeeeeeeeee: ', game)

  // TODO: implement for anonymous users (user_id = 1 or user_id = 2)
  // if (game[0].player1 === 1) { // anonymous user
    
  // }

  // updates game to completed status
  await knex('games')
    .where(knex.raw(`room_id = ${roomNum} AND game_index = '${gameIndex}'`))
    .update('game_completed', 1) 
  // console.log('++++++++++++++++++++++++++++++++++++++ GAME STATUS UPDATED TO COMPLETED')

  // if player1 won, updates win if player1 in the user table
  if (winner === 'player1') {
    await knex('users')
      .where(knex.raw(`user_id = ${game[0].player1}`))
      .increment('wins', 1) 
    // console.log('-------------------------------------- WINNER (PLAYER 1) UPDATED');

    // if player2 lost, updates win if player1 in the user table
    await knex('users')
      .where(knex.raw(`user_id = ${game[0].player2}`))
      .increment('losses', 1) 
    // console.log('-------------------------------------- LOSER (PLAYER 2) UPDATED');
  } else if (winner === 'player2') {
    // if player2 won, updates win if player2 in the user table
    await knex('users')
      .where(knex.raw(`user_id = ${game[0].player2}`))
      .increment('wins', 1)
    // console.log('-------------------------------------- WINNER (PLAYER 2) UPDATED');

    // if player1 lost, updates win if player1 in the user table
    await knex('users')
      .where(knex.raw(`user_id = ${game[0].player1}`))
      .increment('losses', 1) 
    // console.log('-------------------------------------- LOSER (PLAYER 1) UPDATED');
  }
  
  // marks hexes to be deleted
  await deleteHex(game[0].game_id); 
  // console.log('===================================== HEXES MARKED AS COMPLETED');
}

// Force game to end when player leaves the room
const forceEndGame = async (room) => {
  // console.log('\nforce ending the game... room: ', room, '\n')
  let roomNum = room.split('*').join('');
  let gameId = await getGameIdByRoom(room); // returns [{game_id: ##}, {game_id: ##}]
  // console.log('\ngameid or something:\n', gameId)

  await knex('games')
    .where(knex.raw(`${roomNum} = room_id`))
    .update('game_completed', true)

    deleteHex(gameId[0].game_id);
}

// Gets the game ID by using the room
const getGameIdByRoom = async (room) => {
  // console.log('\ngetting the game id by room...\n')
  let roomNum = room.split('*').join('');
  return await knex('games')
    .select()
    .where(knex.raw(`${roomNum} = room_id`))
    .returning('game_id')
}

/////////////////////// Sets players for the game ///////////////////////
const setGamePlayers = async (username, currentPlayer, gameIndex, room) => {
  // console.log('\nsetting game players in the db...\n');

  // console.log(`\nsetGamePlayers in db: username (${username}), currentPlayer (${currentPlayer}), gameIndex (${gameIndex}), room (${room})\n`)

  let roomNum = room.split('*').join('');
  let playerId = await currentPlayer[currentPlayer.length - 1]; // will be '1' or '2' as a string
  let userId = await getUserId(username); // returns an object
  
  if (playerId === '1') { // if updating for player 1
    await knex('games')
      .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
      .update('player1', userId[0].user_id)

  } else if (playerId === '2') { // else if updating for player two
    await knex('games')
      .where(knex.raw(`'${gameIndex}' = game_index AND ${roomNum} = room_id`))
      .update('player2', userId[0].user_id)
  }
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
  getPlayerUsername,
  forceEndGame,
  getGameIdByRoom
};