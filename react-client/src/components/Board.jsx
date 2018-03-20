import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { setSocket, setRoom, setUserPlayer, selectHex, highlightNeighbors, highlightOpponents, moveUnits, reinforceHex, switchPlayer, drawBoard, setGameIndex } from '../../src/actions/actions.js';
import axios from 'axios';
import socketIOClient from "socket.io-client";
const uuidv4 = require('uuid/v4');

import SidebarLeft from './Sidebar.jsx';
import DefaultState from '../store/DefaultState.js';

class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      endpoint: "http://127.0.0.1:3000", // local host on local build, should be "/" for heroku deployment as sockets are hosted on root
      socket: null,
      room: null
    }
  }

  componentDidMount() {
    (async () => {
      let socket = await socketIOClient("http://127.0.0.1:3000");
      this.props.setSocket(socket);
      this.props.socket.on('newGame', data => {
        if (typeof data === 'string') { // server sends string if player is first player to join room
          !this.props.playerAssigned && this.props.setUserPlayer('player1'); // so for that client, they should be assigned to player 1
        } else {
          this.props.drawBoard(data.board); // if the server sends an object, it means that the player is player 2
          this.props.setGameIndex(data.gameIndex); // if so, set game index
          this.props.selectHex({}); // initialize selected hex
          this.props.highlightNeighbors([]); // and neighbors
          this.props.setRoom(data.room);
          !this.props.playerAssigned && this.props.setUserPlayer('player2'); // and set player to player2
        }
      });
      this.props.socket.on('move', (move) => { // when socket receives result of move request,
        this.props.moveUnits(move.updatedOrigin, move.originIndex, move.updatedTarget, move.targetIndex); // it passes to move function
        this.nextTurn(); // then flips turn to next turn, which also triggers reinforce/supply
      });
      this.props.socket.on('win', () => {
        alert('You win!');
      });
      this.props.socket.on('lose', () => {
        alert('You lose!');
      });
      this.props.socket.on('failure', () => { // should only happen if the server finds that its board state does not match what the client sends w/ request
        alert('aaaaaaaaaaaaaaaaaaaaah cheating detected aaaaaaaaaaaaaaaah')
      });
    })();
  }

  handleClick(e, hex) {
    if (!this.props.selectedHex.hasOwnProperty('index') || this.props.selectedHex.index === hex.index) { // since selected hex is either empty object or hex, check if hex is selected and if click is on selected hex
      this.handleSelectClick(e, hex); // if either of these, reoute to select click function
    } else {
      this.handleMoveClick(e, hex); // otherwise, click must be an attempt at a move
    }
  }

  handleSelectClick(e, hex) {
    if (hex.player === this.props.currentPlayer && hex.player === this.props.userPlayer) { // if selected hex is owned by user and it's their turn,
      let neighbors = [];
      let targetCs = hex.coordinates;
      this.props.boardState.forEach(otherHex => { // check each hex
        let oHexCs = otherHex.coordinates;
        if (oHexCs[0] === targetCs[0] && oHexCs[1] === targetCs[1]) { // if clicked hex is equal to current hex,
          this.props.selectedHex.hasOwnProperty('index') ? this.props.selectHex({}) : this.props.selectHex(hex); // toggle it as selected hex
        }
        if ((oHexCs[0] <= targetCs[0] + 1 && oHexCs[0] >= targetCs[0] - 1) && // then, if hex's every coordinate is within +/-1 of target hex,
        (oHexCs[1] <= targetCs[1] + 1 && oHexCs[1] >= targetCs[1] - 1) &&
        (oHexCs[2] <= targetCs[2] + 1 && oHexCs[2] >= targetCs[2] - 1) &&
        (hex.index !== otherHex.index)) // but hex is not selected hex,
        {
          neighbors.push(otherHex.index); // mark as neighor and put in neighbors array
        }
      })
      this.props.highlightNeighbors(neighbors); // dispatch neighbors array to reducer
    }
  }

  handleMoveClick(e, hex) { // if move click,,
    if (this.props.neighbors.indexOf(hex.index) > -1) { // check if clicked hex is a neighbor
      let board = this.props.boardState;
      let origin = this.props.selectedHex;
      let originIndex = board.indexOf(origin); // grab index of hex in board state array for replacement in reducer
      let targetIndex = board.indexOf(hex); // same for target
      let target = board[targetIndex];

      let updatedTarget = { // create copy of target hex
        ...target,
        swordsmen: target.swordsmen += origin.swordsmen,
        archers: target.archers += origin.archers,
        knights: target.knights += origin.knights,
        player: this.props.userPlayer
      }
      let updatedOrigin = { // reinitialize hex they left
        ...origin,
        swordsmen: 0,
        archers: 0,
        knights: 0,
        player: null
      }
      this.sendMoveRequest(updatedOrigin, originIndex, updatedTarget, targetIndex); // send information to be sent over socket
    } else { //  if selected hex is not a neighbor,
      alert('AAAAAAAA') // alert player they can't move there
    }
  }

  sendMoveRequest(updatedOrigin, originIndex, updatedTarget, targetIndex) {
    const move = { // package outputs
      updatedOrigin: updatedOrigin,
      originIndex: originIndex,
      updatedTarget: updatedTarget,
      targetIndex: targetIndex,
      gameIndex: this.props.gameIndex,
      room: this.props.room,
      currentPlayer: this.props.currentPlayer,
      socketId: this.props.socket.id // including socket id, to route personal message if necessary
    }
    this.props.socket.emit('move', move); // and dispatch to socket
  }

  nextTurn() { // after move completes,
    let currentPlayer = this.props.currentPlayer;
    currentPlayer === 'player1' ? currentPlayer = 'player2' : currentPlayer = 'player1'; // toggle player from player 1 to player 2 or vice versa
    this.props.switchPlayer(currentPlayer);
    this.props.boardState.forEach(hex => { // check each hex
      if (hex.player && hex.player === currentPlayer) { // if hex has a resource and is controlled by user who's turn is starting,
        if (hex.hasGold === true) {
          this.props.reinforceHex(this.props.boardState.indexOf(hex), 'gold'); // reinforce with relevant resource type
        } else if (hex.hasWood === true) {
          this.props.reinforceHex(this.props.boardState.indexOf(hex), 'wood');
        } else if (hex.hasMetal === true) {
          this.props.reinforceHex(this.props.boardState.indexOf(hex), 'metal');
        }
      }
    })
  }

  render() {
    return (
      <div className="Board flex">
        <HexGrid height={800} viewBox="-50 -50 150 150">
          <Layout size={{ x: 13, y: 13 }} flat={false} spacing={1.2} origin={{ x: -15, y: -25 }}>
            {this.props.boardState ? this.props.boardState.map(hex => {
              let targetClass = '';
              if (hex.player !== null && hex.player !== this.props.userPlayer) { // logic for assigning CSS classes
                targetClass += 'opponent';
              } else if (this.props.selectedHex.index === hex.index) {
                targetClass += 'selected';
              } else if (hex.player === this.props.userPlayer) {
                targetClass += 'friendly';
              } else if (this.props.neighbors.indexOf(hex.index) > -1) {
                targetClass += 'neighbor';
              } else if (hex.hasGold) {
                targetClass += 'gold';
              } else if (hex.hasWood) {
                targetClass += 'wood';
              } else if (hex.hasMetal) {
                targetClass += 'metal';
              }
              return <Hexagon
                key={uuidv4()}
                className={targetClass}
                onClick={(e) => this.handleClick(e, hex)}
                q={hex.coordinates[0]}
                r={hex.coordinates[1]}
                s={hex.coordinates[2]}>
                <Text>
                  {/*<img src="https://png.icons8.com/metro/50/000000/sword.png"/>*/}
                  {`${hex.swordsmen.toString()}, ${hex.archers.toString()}, ${hex.knights.toString()}`}
                  {/*<img src="https://png.icons8.com/windows/50/000000/archer.png"/>*/}
                  {/*<img src="https://png.icons8.com/ios/50/000000/knight-shield-filled.png"/>*/}
                </Text>
              </Hexagon>
            }): <div>Want to play with a friend? Send them this link: </div>}
          </Layout>
        </HexGrid>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    socket: state.state.socket,
    room: state.state.room,
    boardState: state.state.boardState,
    neighbors: state.state.neighbors,
    selectedHex: state.state.selectedHex,
    gameIndex: state.state.gameIndex,
    currentPlayer: state.state.currentPlayer,
    playerAssigned: state.state.playerAssigned,
    userPlayer: state.state.userPlayer
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ setSocket, setRoom, setUserPlayer, selectHex, highlightNeighbors, drawBoard, highlightOpponents, moveUnits, reinforceHex, switchPlayer, setGameIndex }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(Board);