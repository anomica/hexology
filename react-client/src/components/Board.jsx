import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { setUserPlayer, selectHex, highlightNeighbors, highlightOpponents, moveUnits, reinforceHex, switchPlayer, drawBoard, setGameIndex } from '../../src/actions/actions.js';
import axios from 'axios';
import socketIOClient from "socket.io-client";
const uuidv4 = require('uuid/v4');

import SidebarLeft from './Sidebar.jsx';

class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      endpoint: "http://127.0.0.1:3000",
      socket: null,
      room: null
    }
  }

  componentDidMount() {
    this.setState({
      socket: socketIOClient(this.state.endpoint)
    }, () => {
      this.state.socket.on('newGame', data => {
        if (typeof data === 'string') {
          !this.props.playerAssigned && this.props.setUserPlayer('player1');
        } else {
          this.props.drawBoard(data.board);
          this.props.setGameIndex(data.gameIndex);
          this.props.selectHex({});
          this.props.highlightNeighbors([]);
          this.setState({
            room: data.room
          })
          !this.props.playerAssigned && this.props.setUserPlayer('player2');
        }
      });
      this.state.socket.on('move', (move) => {
        this.props.moveUnits(move.updatedOrigin, move.originIndex, move.updatedTarget, move.targetIndex);
        this.nextTurn();
      })
      this.state.socket.on('win', () => {
        alert('You win!');
      })
      this.state.socket.on('lose', () => {
        alert('You lose!');
      })
      this.state.socket.on('failure', () => {
        alert('aaaaaaaaaaaaaaaaaaaaah cheating detected aaaaaaaaaaaaaaaah')
      })
    });
  }

  sendMoveRequest(updatedOrigin, originIndex, updatedTarget, targetIndex) {
    const move = {
      updatedOrigin: updatedOrigin,
      originIndex: originIndex,
      updatedTarget: updatedTarget,
      targetIndex: targetIndex,
      gameIndex: this.props.gameIndex,
      room: this.state.room,
      currentPlayer: this.props.currentPlayer,
      socketId: this.state.socket.id
    }
    this.state.socket.emit('move', move);
  }

  handleClick(e, hex) {
    if (!this.props.selectedHex.hasOwnProperty('index') || this.props.selectedHex.index === hex.index) {
      this.handleSelectClick(e, hex);
    } else {
      this.handleMoveClick(e, hex);
    }
  }

  handleSelectClick(e, hex) {
    if (hex.player === this.props.currentPlayer && hex.player === this.props.userPlayer) {
      let neighbors = [];
      let targetCs = hex.coordinates;
      this.props.boardState.forEach(otherHex => {
        let oHexCs = otherHex.coordinates;
        if (oHexCs[0] === targetCs[0] && oHexCs[1] === targetCs[1]) {
          this.props.selectedHex.hasOwnProperty('index') ? this.props.selectHex({}) : this.props.selectHex(hex);
        }
        if ((oHexCs[0] <= targetCs[0] + 1 && oHexCs[0] >= targetCs[0] - 1) &&
        (oHexCs[1] <= targetCs[1] + 1 && oHexCs[1] >= targetCs[1] - 1) &&
        (oHexCs[2] <= targetCs[2] + 1 && oHexCs[2] >= targetCs[2] - 1) &&
        (hex.index !== otherHex.index))
        {
          neighbors.push(otherHex.index);
        }
      })
      this.props.highlightNeighbors(neighbors);
    }
  }

  handleMoveClick(e, hex) {
    if (this.props.neighbors.indexOf(hex.index) > -1) {
      let board = this.props.boardState;
      let origin = this.props.selectedHex;
      let originIndex = board.indexOf(origin);
      let targetIndex = board.indexOf(hex);
      let target = board[targetIndex];

      let updatedTarget = {
        ...target,
        units: target.units += origin.units,
        player: this.props.userPlayer
      }
      let updatedOrigin = {
        ...origin,
        units: 0,
        player: null
      }
      this.sendMoveRequest(updatedOrigin, originIndex, updatedTarget, targetIndex);
    } else {
      alert('AAAAAAAA')
    }
  }

  nextTurn() {
    let currentPlayer = this.props.currentPlayer;
    currentPlayer === 'player1' ? currentPlayer = 'player2' : currentPlayer = 'player1';
    this.props.switchPlayer(currentPlayer);
    this.props.boardState.forEach(hex => {
      if (hex.hasGold === true && hex.player && hex.player === currentPlayer) {
        this.props.reinforceHex(this.props.boardState.indexOf(hex));
      }
    })
  }

  render() {
    return (
      <div className="Board">
        <HexGrid height={800} viewBox="-50 -50 150 150">
          <Layout size={{ x: 13, y: 13 }} flat={false} spacing={1.2} origin={{ x: -15, y: -25 }}>
            {this.props.boardState ? this.props.boardState.map(hex => {
              let targetClass = '';
              if (hex.player !== null && hex.player !== this.props.userPlayer) {
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
                  {hex.units.toString()}
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
  return bindActionCreators({ setUserPlayer, selectHex, highlightNeighbors, drawBoard, highlightOpponents, moveUnits, reinforceHex, switchPlayer, setGameIndex }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(Board);
