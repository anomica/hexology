const express = require('express');
const bodyParser = require('body-parser');
const url = require('url');
let path = require('path');
const db = require('../database/index');
const passport = require('passport');
const session = require('express-session');
const uuidv4 = require('uuid/v4');
const app = express();
const http = require("http");
const server = http.createServer(app);
var cors = require('cors');
const socketIo = require("socket.io");
const io = socketIo(server);
require('./auth-config.js')(passport);
require('events').EventEmitter.prototype._maxListeners = 100;
// const http = require('http').Server(app);
// require('../server/config/passport')(passport);
app.use(session({
  secret: process.env.SESSION_PASSWORD || 'supersecretsecret',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '../react-client/dist')));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());
app.use(cors())

// local Login Strategy
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).end('You must log in to do that!');
}

app.get('/persistUser', (req, res) => {
  // console.log('req.session.passport.user:', req.session.passport.user);
  // console.log('passport.user:', passport.user);
  // console.log('req.user:', req.user);
  res.send(req.user);
});

app.post('/signup', passport.authenticate('local-signup'), (req, res) => {
  // console.log('req.body', req.body);
  // console.log('req.user upon login:', req.user);
  // let response = {
  //   email: req.body.email,
  //   password: req.body.password
  // }
  res.status(201).json(req.user);
});

app.post('/login', passport.authenticate('local-login'), (req, res) => {
  res.status(201).json(req.user);
});

app.post('/logout', isLoggedIn, function (req, res) {
  req.logout();
  res.clearCookie('connect.sid').status(200).redirect('/');
});

let games = {}; // TODO: TAKE THIS OUT

const coordinateGenerator = (numRows, numCols) => { // creates an array of coordinates for hexes
  let j = 0;
  let y = 0;
  let hexes = [];

  const rowGenerator = (rowIndex, lDiag, rDiag) => { // creates a row in the grid
    let iterations;
    let row = [];
    if (rowIndex % 2 === 0) {
      iterations = numCols;
    } else {
      iterations = numCols - 1;
    }

    for (let i = 0; i < iterations; i++) {
      row.push([lDiag, rowIndex, rDiag]);
      lDiag++;
      rDiag--;
    }
    return row;
  }

  for (let i = 0; i < numRows; i++) {
    if (i % 2 !== 0) {
      y--;
    }
    hexes = hexes.concat(rowGenerator(i, j, y))
    if (i % 2 !== 0) {
      j--;
    }
  }
  return hexes;
}

const isResourceHex = () => { // decides if hex gets resource
  return Math.floor(Math.random() * (5 - 1) + 1) % 4 === 0;
};

const gameInit = (numRows, numCols) => { // creates an array of hexes with properties (the board)
  let i = 0;
  const hexes = coordinateGenerator(numRows, numCols);

  return hexes.map((coordinates, index) => {
    let hex = {};
    hex.coordinates = coordinates;
    hex.index = uuidv4();
    hex.swordsmen = 0;
    hex.archers = 0;
    hex.knights = 0;

    if (index === 0) {
      hex.player = 'player1';
      hex.swordsmen = 10;
    } else if (index === hexes.length - 1) {
      hex.player = 'player2';
      hex.swordsmen = 10;
    } else {
      hex.player = null;
    }
    if (isResourceHex() && index !== 0 && index !== hexes.length - 1) { // for resource hexes that are not starting hexes for either player,
      let resourceType = Math.floor(Math.random() * 3) + 1; // roll a d3
      hex.hasGold = false;
      hex.hasWood = false;
      hex.hasMetal = false;
      if (resourceType === 1) { // assign resource type according to dice roll
        hex.hasGold = true;
      } else if (resourceType === 2) {
        hex.hasWood = true;
      } else {
        hex.hasMetal = true;
      }
    }
    return hex;
  });
};

app.get('/rooms', (req, res) => {
  res.status(200).json(io.sockets.adapter.rooms);
});

let roomNum = 0;
let openRooms = [];

const selectRoom = () => {
  let lowest;
  let index;
  let selected;
  if (openRooms.length) {
    openRooms.forEach((room, i) => {
      if (!lowest) {
        lowest = Number(room);
        index = i
      } else {
        if (Number(room) < lowest) {
          lowest = Number(room);
          index = i;
        }
      }
    });
  }
  selected = openRooms[index];
  openRooms.splice(index, 1);
  return selected;
}

const findOpenRooms = () => { // finds an open room, right now just picking the first one
  openRooms = [];
  // may need to create an array of open rooms
  // and have a setInterval to keep checking them and updating them so that no one gets stuck waiting too long
  var rooms = io.sockets.adapter.rooms;
  for (room in rooms) {
    let roomSize = Object.keys(rooms[room].sockets).length;
    if (roomSize === 1 && room[0] === '*') {
      if (!openRooms.includes(room)) {
        openRooms.push(room);
      }
      return room;
    }
  }
}

setInterval(findOpenRooms, 1000);

io.on('connection', async (socket) => { // initialize socket on user connection
  console.log('User connected');

  socket.on('newGame', () => {
    let newRoom = `*${roomNum}`
    socket.join(newRoom); // create a new room
    io.to(newRoom).emit('newGame', { room: newRoom }); // and send back a string to initialize for player 1
    socket.broadcast.emit('newRoom', { roomName: newRoom, room: io.sockets.adapter.rooms[newRoom] });
    roomNum++; // increment room count to assign new ro
  })

  socket.on('joinGame', async (data) => {
    await socket.join(data.room);
    const board = await gameInit(5, 4);
    let gameIndex = uuidv4();

    //TODO: TAKE OUT THIS OBJECT ONCE DB WORKS
    games[gameIndex] = { // initialize game in local state, to be replaced after we refactor to use DB
      board: board, // set board,
      playerOneResources: { // p1 resources,
        gold: 10,
        wood: 10,
        metal: 10
      },
      playerTwoResources: { // and p2 resources
        gold: 10,
        wood: 10,
        metal: 10
      }
    };

    const newGameBoard = {
      board: board,
      gameIndex: gameIndex,
      room: room
    }

    await db.createGame(room, board, gameIndex); // saves the new game & hexes in the databases

    await io.to(data.room).emit('gameCreated', newGameBoard); // send game board to user
  })

  socket.on('move', data => { // move listener
    moveUnits(data, socket); // pass move data and socket to function to assess move
  })

  socket.on('buy', data => {
    buyUnits(data.type, data.player, data.gameIndex, data.socketId, data.room);
  })

  socket.on('disconnect', () => {
    console.log('user disconnected');
  })
})

const moveUnits = async (data, socket) => {
  // THIS LOGIC WILL MOST LIKELY HAPPEN IN TANDEM WITH THE DATABASE, BUT IS WRITTEN IN LOCAL STORAGE FOR NOW
  let updatedOrigin = await data.updatedOrigin; // new origin object as sent by user
  let originIndex = await data.originIndex; // with its index,
  let updatedTarget = await data.updatedTarget; // same for target
  let targetIndex = await data.targetIndex;
  let gameIndex = await data.gameIndex; // game index to find in storage
  let room = await data.room; // room to send move to

  ////////// uncomment these if using server game object //////////
  // let board = games[gameIndex].board; // game board found using above index
  // let masterOrigin = await board[originIndex];// origin to be updated/checked against
  // let masterTarget = await board[targetIndex]
  // let masterOrigCs = masterOrigin.coordinates; // coordinates of those masters
  // let masterTarCs = masterTarget.coordinates;
  ////////////////////////////////////////////////////////////////

  ////////// uncomment these if using database //////////////////
  let board = await db.getGameBoard(room, gameIndex); // gets game board from db using above index
  let masterOrigin = await db.getHex(updatedOrigin.index);// origin to be updated/checked against
  let masterTarget = await db.getHex(updatedTarget.index); // same for target
  let masterOrigCs = [masterOrigin[0].coordinate_0, masterOrigin[0].coordinate_1, masterOrigin[0].coordinate_2]; // coordinates of those masters
  let masterTarCs = [masterTarget[0].coordinate_0, masterTarget[0].coordinate_1, masterTarget[0].coordinate_2]; // coordinates of those masters
  ///////////////////////////////////////////////////////////////

  let origCs = await updatedOrigin.coordinates; // as well as coordinates of the ones sent by user
  let tarCs = await updatedTarget.coordinates;
  let currentPlayer = await data.currentPlayer; // player whose turn it is
  let socketId = await data.socketId; // socket to send back response if necessary

  let legal = await checkLegalMove(masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, masterOrigin, masterTarget); // assess legality of move
  if (legal) { // if legal move,
    let collision = await checkForCollision(updatedOrigin.index, updatedTarget.index, gameIndex, room); // check for collision
    // let collision = await checkForCollision(originIndex, targetIndex, gameIndex, room); // check for collision
    if (collision) {
      if (collision === 'friendly') { // if collision and collision is friendly,
        await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board); // update hexes without combat occuring

        await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin); // updates the original hex and new hex in the db for the current player

        await io.to(room).emit('move', move); // then send back okay to move units
      } else {
        let result = await resolveCombat(updatedOrigin.index, updatedTarget.index, gameIndex, room, updatedOrigin, updatedTarget, currentPlayer); //otherwise, roll for combat
        result.isOver ? // if attacker wins, need to change hexes and send back board
        (async () => {
          io.to(socketId).emit('win'); // the attacker gets a personal win message
          socket.to(room).emit('lose'); // while the rest of the room (defender) gets lose message
          const board = gameInit(5, 4);
          let gameIndex = uuidv4();

          //TODO: TAKE OUT THIS OBJECT ONCE DB WORKS
          games[gameIndex] = { // initialize game in local state, to be replaced after we refactor to use DB
            board: board, // set board,
            playerOneResources: { // p1 resources,
              gold: 10,
              wood: 10,
              metal: 10
            },
            playerTwoResources: { // and p2 resources
              gold: 10,
              wood: 10,
              metal: 10
            }
          };

          const newGameBoard = {
            board: board,
            gameIndex: gameIndex,
            room: room
          }
          
          await db.createGame(room, board, gameIndex); // saves the new game & hexes in the databases
          
          await io.to(data.room).emit('gameCreated', newGameBoard); // send game board to user
        })() :
        (async () => { // and vice versa
          let move = {
            updatedOrigin: result.updatedOrigin,
            updatedTarget: result.updatedTarget,
            originIndex: originIndex,
            targetIndex: targetIndex
          }
          await io.to(room).emit('move', move);
        })();
        // const board = gameInit(5, 4); // the reinit board
        // gameIndex = uuidv4();
        // games[gameIndex] = {
        //   board: board,
        //   playerOneResources: {
        //     gold: 10,
        //     wood: 10,
        //     metal: 10
        //   },
        //   playerTwoResources: {
        //     gold: 10,
        //     wood: 10,
        //     metal: 10
        //   }
        // };
        // const newGameBoard = {
        //   board: board,
        //   gameIndex: gameIndex,
        //   room: room
        // }
        // io.to(room).emit('newGame', newGameBoard);

      }
    } else {
      await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board); // if move is to unoccupied hex, execute move
      let move = await { 
        originIndex: originIndex, 
        updatedOrigin: updatedOrigin, 
        targetIndex: targetIndex, 
        updatedTarget: updatedTarget
      };

      await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin); // updates the original hex and new hex in the db for the current player

      await io.to(room).emit('move', move);
    }
  } else { // if move request is not legal, send socket failure message, cheating detected
    await io.to(room).emit('failure');
  }
};

const checkLegalMove = async (masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, masterOrigin, masterTarget, cb) => { // to check move legality,

  console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> CHECKING LEGAL MOVE');
  console.log('masterOrigCs: ', masterOrigCs);
  console.log('origCs: ', origCs);
  console.log('masterTarCs: ', masterTarCs);
  console.log('tarCs: ', tarCs);

  let isLegal = false;
  if (await masterOrigCs[0] === origCs[0] && masterOrigCs[1] === origCs[1] && masterOrigCs[2] === origCs[2] && // make sure all coordinates match between origin
      masterTarCs[0] === tarCs[0] && masterTarCs[1] === tarCs[1] && masterTarCs[2] === tarCs[2]) { // and target **********NEED TO ADD CHECK TO MAKE SURE RESOURCE COUNTS AND UNIT COUNTS MATCH
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> COORDINATES MATCH');

    ///////////////////////// USE THIS IF USING GAMES OBJECT ON SERVER ////////////////////////////////////
    // if (masterOrigin.archers === updatedOrigin.archers + updatedTarget.archers &&
    // masterOrigin.knights === updatedOrigin.knights + updatedTarget.knights &&
    // masterOrigin.swordsmen === updatedOrigin.swordsmen + updatedTarget.swordsmen) {
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////// USE THIS IF USING DATABASE //////////////////////////////////////////////
    if (masterOrigin[0].archers === updatedOrigin.archers + updatedTarget.archers &&
    masterOrigin[0].knights === updatedOrigin.knights + updatedTarget.knights &&
    masterOrigin[0].swordsmen === updatedOrigin.swordsmen + updatedTarget.swordsmen) {
    //////////////////////////////////////////////////////////////////////////////////////////////////

      isLegal = true;
      return true;
    } else { // master origin units do not match updated origin units + updated target units
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> MISMATCH IN UNITS');
      return false;
    }
  } else {
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> COORDINATES DO NOT MATCH');
    console.log('masterOrigin: ', masterOrigin);
    console.log('updatedOrigin: ', updatedOrigin);
    console.log('updatedTarget: ', updatedTarget);
    return false;
  }
}

const checkForCollision = async (originHexIndex, targetHexIndex, gameIndex, room) => {

  //////////////////////////////// IF USING GAME OBJECT ON THE SERVER /////////////////////////
  // let game = games[gameIndex].board;
  // let origin = game[originIndex]; // uses games object on server
  // let target = game[targetIndex]; // uses games object on server
  // if (origin.player && target.player) {
  //   let collision = '';
  //   origin.player === target.player
  //     ? (collision += 'friendly')
  //     : (collision += 'opponent'); // if collision, decide if collision is with own units or enemy units
  //   return collision;
  // } else {
  //   return false;
  // }
  ////////////////////////////////////////////////////////////////////////////////////////////

  /////////////////////////////////// IF USING DATABASE //////////////////////////////////////
  let game = await db.getGameBoard(room, gameIndex);
  let origin = await db.getHex(originHexIndex); // NOTE: returns an object
  let target = await db.getHex(targetHexIndex); // NOTE: returns an object
  
  if (origin[0].player && target[0].player) {
    let collision = '';
    origin[0].player === target[0].player
      ? (collision += 'friendly')
      : (collision += 'opponent'); // if collision, decide if collision is with own units or enemy units
    return collision;
  } else {
    return false;
  }
  /////////////////////////////////////////////////////////////////////////////////////////
};

const updateHexes = async (originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board) => {
  games[gameIndex].board[originIndex] = await updatedOrigin;
  games[gameIndex].board[targetIndex] = await updatedTarget; // This is what will happen on an ordinary move

  currentPlayer === 'player1' ? currentPlayer = 'player2' : currentPlayer = 'player1'; // then player will toggle
  await reinforceHexes(gameIndex, currentPlayer, targetIndex, room, board); // then check to see if there are reinforcements
}

const resolveCombat = async (originIndex, targetIndex, gameIndex, room, updatedOrigin, updatedTarget, currentPlayer) => { // if combat,

  ////////////////////////////////// IF USING GAME OBJECT ON SERVER //////////////////////////////////
  // let attacker = updatedTarget // get attacking hex
  // let defender = games[gameIndex].board[targetIndex]; // and defending hex
  // let attackerPlayer = attacker.player;
  // let defenderPlayer = defender.player;
  // let attackerDidWin;

  // let swordsMenKnight = attacker.swordsmen - defender.knights;
  // let knightsArchers = attacker.knights - defender.archers;
  // let archerSwordsmen = attacker.archers - defender.swordsmen;
  ///////////////////////////////////////////////////////////////////////////////////////////////////

  ////////////////////////////////// IF USING DATABASE //////////////////////////////////////////////
  let attacker = await db.getHex(originIndex); // get attacking hex (NOTE: returns an object)
  let defender = await db.getHex(targetIndex); // and defending hex (NOTE: returns an object)
  let attackerPlayer = attacker[0].player;
  let defenderPlayer = defender[0].player;
  let attackerDidWin;

  let swordsMenKnight = attacker[0].swordsmen - defender[0].knights;
  let knightsArchers = attacker[0].knights - defender[0].archers;
  let archerSwordsmen = attacker[0].archers - defender[0].swordsmen;
  ///////////////////////////////////////////////////////////////////////////////////////////////////

  console.log('++++++++++++++++++++++++++++++++++++++++++++++++ RESOLVE COMBAT');
  console.log('ATTACKER: ', attacker);
  console.log('DEFENDER: ', defender);
  console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');

  console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& UNITS COMPARISON &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&')
  console.log('swordsMenKnight: ', '\n ATTACKER SWORDSMEN: ', attacker[0].swordsmen, '\n DEFENDER KNIGHTS: ', defender[0].knights, '\n');
  console.log('knightsArchers: ', '\n ATTACKER KNIGHTS: ', attacker[0].knights, '\n DEFENDER ARCHERS: ', defender[0].archers, '\n');
  console.log('archerSwordsmen: ', '\n ATTACKER ARCHERS: ', attacker[0].archers, '\n DEFENDER SWORDSMEN: ', defender[0].swordsmen);
  console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&');

  let attackerSwordsmen;
  let attackerKnights;
  let attackerArchers;
  let defenderSwordsmen;
  let defenderKnights;
  let defenderArchers;

  if (swordsMenKnight > 0) {
    attackerSwordsmen = swordsMenKnight;
    defenderKnights = 0;
  } else {
    attackerSwordsmen = 0;
    defenderKnights = Math.abs(attackerSwordsmen);
  }

  if (knightsArchers > 0) {
    attackerKnights = knightsArchers;
    let defenderArchers = 0;
  } else {
    attackerKnights = 0;
    defenderArchers = Math.abs(knightsArchers);
  }

  if (archerSwordsmen > 0) {
    attackerArchers = archerSwordsmen;
    defenderSwordsmen = 0;
  } else {
    attackerArchers = 0;
    defenderSwordsmen = Math.abs(archerSwordsmen);
  }

  let defendingArmy = defenderSwordsmen + defenderArchers + defenderKnights;
  let attackingArmy = attackerArchers + attackerSwordsmen + attackerKnights;

  if (defendingArmy > attackingArmy) {
    updatedOrigin = { // reinitialize hex they left
      ...updatedOrigin,
      swordsmen: updatedOrigin.swordsmen + attackerSwordsmen,
      archers: updatedOrigin.knights + attackerKnights,
      knights: updatedOrigin.archers + attackerArchers,
      player: attackerPlayer
    }
    updatedTarget = {
      ...updatedTarget,
      swordsmen: defenderSwordsmen,
      knights: defenderKnights,
      archers: defenderArchers,
      player: defenderPlayer
    }
  } else { // tie goes to attacker
    attackerDidWin = true;
    updatedTarget = {
      ...updatedTarget,
      swordsmen: attackerSwordsmen,
      knights: attackerKnights,
      archers: attackerArchers,
      player: attackerPlayer
    }
  }

  await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer); // update the board

  let masterOrigin = await db.getHex(updatedOrigin.index);
  
  await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin);

  return {
    isOver: await attackerDidWin ? checkForWin(defenderPlayer, attackerPlayer, gameIndex, room) : false,
    updatedOrigin: updatedOrigin,
    updatedTarget: updatedTarget
  }
};

const checkForWin = async (losingPlayer, winningPlayer, gameIndex, room) => {
  let isGameOver = true;

  //////////////// IF USING GAME OBJECT ON SERVER ////////////////
  // games[gameIndex].board.forEach(hex => {
  //   if (hex.player === losingPlayer) {
  //     isGameOver = false;
  //   }
  // })
  ////////////////////////////////////////////////////////////////

  ////////////////////// IF USING DATABASE //////////////////////
  let board = await db.getGameBoard(room, gameIndex);
  board.forEach(hex => {
    console.log('--------------------------------------------- CHECKING FOR WIN ------------------------------')
    console.log('hex id: ', hex.hex_id, '\nhex player: ', hex.player);
    if (hex.player === losingPlayer) {
      isGameOver = false;
    }
  })
  ////////////////////////////////////////////////////////////////

  if (isGameOver) {
    return winningPlayer;
  }
  return isGameOver;
}

const reinforceHexes = async (gameIndex, currentPlayer, targetIndex, room, board) => {
  let playerResources;
  currentPlayer === 'player1' ? // determine player to give resources to depending on whose turn is starting
  playerResources = games[gameIndex].playerOneResources : // store resource reference to save time typing
  playerResources =  games[gameIndex].playerTwoResources;

  let playerId = await currentPlayer[currentPlayer.length - 1];
  
  await games[gameIndex].board.forEach(hex => { // then check each hex
    if (hex.player === currentPlayer) { // if hex is owned by current player,
      if (hex.hasGold) { // check if resource hex
        playerResources.gold += 10; // add resource to player
        hex.hasGold = false; // and use up resources on hex
      } else if (hex.hasWood) {
        playerResources.wood += 10;
        hex.hasWood = false; // and use up resources on hex
      } else if (hex.hasMetal) {
        playerResources.metal += 10;
        hex.hasMetal = false; // and use up resources on hex
      }
    }
  })
}

const deleteOldGames = async () => {
  let oldGames = await db.getOldGames();
  for (let i = 0; i < oldGames.length; i++) {
    await db.deleteHex(oldGames[i].game_id); // first mark hexes to delete
    await db.deleteGames(oldGames[i].game_id); // then delete the game
  }
}

// Check for old games and marks them as completed
setInterval(deleteOldGames, 86400000);

const buyUnits = async (type, player, gameIndex, socketId, room) => {
  let game = games[gameIndex], resources;
  player === 'player1' ? resources = game.playerOneResources : resources = game.playerTwoResources;
  if (type === 'swordsmen') {
    if (resources.gold >= 10 && resources.metal >= 10) {
      resources.gold -= 10;
      resources.metal -= 10;
      game.board.forEach(hex => {
        if (hex.player === player) {
          hex.swordsmen += 10;
        }
      })
      io.to(room).emit('swordsmen');
      io.to(room).emit('updateResources', {
        playerOneResources: game.playerOneResources,
        playerTwoResources: game.playerTwoResources
      });
    } else {
      io.to(socketId).emit('notEnoughResources');
    }
  } else if (type === 'archers') {
    if (resources.gold >= 10 && resources.wood >= 20) {
      resources.gold -= 10;
      resources.wood -= 20;
      game.board.forEach(hex => {
        if (hex.player === player) {
          hex.archers += 10;
        }
      })
      io.to(room).emit('archers');
      io.to(room).emit('updateResources', {
        playerOneResources: game.playerOneResources,
        playerTwoResources: game.playerTwoResources
      });
    } else {
      io.to(socketId).emit('not enough resources');
    }
  } else if (type === 'knights') {
    if (resources.gold >= 20 && resources.wood >= 20 && resources.metal >= 20) {
      resources.gold -= 20;
      resources.wood -= 20;
      resources.metal -= 20;
      game.board.forEach(hex => {
        if (hex.player === player) {
          hex.knights += 10;
        }
      })
      io.to(room).emit('knights');
      io.to(room).emit('updateResources', {
        playerOneResources: game.playerOneResources,
        playerTwoResources: game.playerTwoResources
      });
    } else {
      io.to(room).emit('not enough resources');
    }
  }
  ////////////////////////// BEGIN DB STUFF //////////////////////////
  // let gameBoard = await db.getGameBoard(room, gameIndex);
  // let currentPlayerResources = await db.getResources(room, gameIndex, player);

  // // console.log(`------------ player resources for ${player}: `, currentPlayerResources[0]);

  // if (type === 'swordsmen') { // if buying swordsmen
  //   // console.log('///////////// LETS BUY SOME ----> SWORDSMEN'); //TODO: delete console log
  //   if (player === 'player1') { // for player 1
  //     if (currentPlayerResources[0].p1_gold >= 10 && currentPlayerResources[0].p1_metal >= 10) { // check if player has enough resources to purchase unit
  //       db.buySwordsmen(room, gameIndex, player); // update units and resources in the db
  //       await io.to(socketId).emit('swordsmen');
  //     } else { // if not enough resources
  //       // console.log('~~~~~~~~~~~ player 1 is too poor to buy SWORDSMEN');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   } else if (player === 'player2') { // else same for player 2
  //     if (currentPlayerResources[0].p2_gold >= 10 && currentPlayerResources[0].p2_metal >= 10) {
  //       db.buySwordsmen(room, gameIndex, player);
  //       await io.to(socketId).emit('swordsmen');
  //     } else {
  //       // if not enough resources
  //       // console.log('~~~~~~~~~~~ player 2 is too poor to buy SWORDSMEN');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   }
  // }

  // if (type === 'archers') { // if buying archers
  //   // console.log('///////////// LETS BUY SOME ----> ARCHERS');
  //   if (player === 'player1') { // for player 1
  //     if (currentPlayerResources[0].p1_gold >= 10 && currentPlayerResources[0].p1_wood >= 20) { // check if player has enough resources to purchase unit
  //       db.buyArchers(room, gameIndex, player); // update units and resources in the db
  //       await io.to(socketId).emit('archers');
  //     } else { // if not enough resources
  //       // console.log('~~~~~~~~~~~ player 1 too poor to buy ARCHERS');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   } else if (player === 'player2') { // else same for player 2
  //     if (currentPlayerResources[0].p2_gold >= 10 && currentPlayerResources[0].p2_wood >= 20) {
  //       db.buyArchers(room, gameIndex, player);
  //       await io.to(socketId).emit('archers');
  //     } else { // if not enough resources
  //       // console.log('~~~~~~~~~~~ player 2 too poor to buy ARCHERS');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   }
  // }

  // if (type === 'knights') { // if buying knights
  //   // console.log('///////////// LETS BUY SOME ----> KNIGHTS');
  //   if (player === 'player1') { // for player 1
  //     if (currentPlayerResources[0].p1_gold >= 20 && currentPlayerResources[0].p1_wood >= 20 && currentPlayerResources[0].p1_metal >= 20) {
  //       // check if player has enough resources to purchase unit
  //       db.buyKnights(room, gameIndex, player); // update units and resources in the db
  //       await io.to(socketId).emit('knights');
  //     } else { // if not enough resources
  //       // console.log('~~~~~~~~~~~ player 1 too poor to buy KNIGHTS');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   } else if (player === 'player2') { // else same for player 2
  //     if (currentPlayerResources[0].p2_gold >= 20 && currentPlayerResources[0].p2_wood >= 20 && currentPlayerResources[0].p2_metal >= 20) {
  //       db.buyKnights(room, gameIndex, player);
  //       await io.to(socketId).emit('knights');
  //     } else { // if not enough resources
  //       // console.log('~~~~~~~~~~~ player 2 too poor to buy KNIGHTS');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   }
  // }
  //////////////////////////// END OF DB STUFF //////////////////////////

  //////////////////////////// SERVER STUFF USING GAME OBJECT //////////////////////////
  // let game = await games[gameIndex], resources;
  // player === 'player1' ? resources = game.playerOneResources : resources = game.playerTwoResources;
  // if (type === 'swordsmen') {
  //   if (resources.gold >= 10 && resources.metal >= 10) {
  //     resources.gold -= 10;
  //     resources.metal -= 10;
  //     await game.board.forEach(hex => {
  //       if (hex.player === player) {
  //         hex.swordsmen += 10;
  //       }
  //     })
  //     await io.to(socketId).emit('swordsmen');
  //   } else {
  //     await io.to(socketId).emit('not enough resources');
  //   }
  // } else if (type === 'archers') {
  //   if (resources.gold >= 10 && resources.wood >= 20) {
  //     resources.gold -= 10;
  //     resources.wood -= 20;
  //     await game.board.forEach(hex => {
  //       if (hex.player === player) {
  //         hex.archers += 10;
  //       }
  //     })
  //     await io.to(socketId).emit('archers');
  //   } else {
  //     await io.to(socketId).emit('not enough resources');
  //   }
  // } else if (type === 'knights') {
  //   if (resources.gold >= 20 && resources.wood >= 20 && resources.metal >= 20) {
  //     resources.gold -= 20;
  //     resources.wood -= 20;
  //     resources.metal -= 20;
  //     await game.board.forEach(hex => {
  //       if (hex.player === player) {
  //         hex.knights += 10;
  //       }
  //     })
  //     await io.to(socketId).emit('knights');
  //   } else {
  //     await io.to(socketId).emit('not enough resources');
  //   }
  // }
}

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../react-client/dist', 'index.html'));
});

//////////////////////////////////////////////////
// TODO: Take out this section - JUST FOR TESTING
app.post('/users', (req, res) => {
  db.addUser(req.body.username, req.body.email, req.body.password);
  res.end();
})
//////////////////////////////////////////////////

// io.listen(process.env.PORT || 3000);
server.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});

// Game State starters