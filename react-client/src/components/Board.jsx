import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { Segment, Confirm, Button, Header, Popup, Image, Modal, Content, Description, Icon, Form, Checkbox, Divider, Label } from 'semantic-ui-react';
import { setRoom, menuToggle, setUserPlayer, selectHex, highlightNeighbors,
         highlightOpponents, moveUnits, reinforceHex, updateResources, swordsmen,
         archers, knights, switchPlayer, drawBoard, setGameIndex, setPlayerOne, setPlayerTwo } from '../../src/actions/actions.js';
import axios from 'axios';
import socketIOClient from "socket.io-client";
const uuidv4 = require('uuid/v4');

import SidebarLeft from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import DefaultState from '../store/DefaultState.js';

class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hex: null,
      modalOpen: false,
      confirmOpen: false,
      tempSwordsmen: 0,
      tempArchers: 0,
      tempKnights: 0
    }
  }

  componentDidMount() {
    console.log('this.props in board:', this.props)
    console.log('state in board: ', this.state)
    let socket = this.props.socket;
    if (this.props.location.state) {
      socket.emit('joinGame', {
        room: this.props.location.state.detail
      });
      !this.props.playerAssigned && this.props.setUserPlayer('player2'); // and set player to player2
      this.props.setRoom(this.props.location.state.detail);
    } else {
      socket.emit('newGame');
      !this.props.playerAssigned && this.props.setUserPlayer('player1'); // so for that client, they should be assigned to player 1
      socket.on('newGame', data => {
        console.log('data in board: ', data)
        this.props.setRoom(data.room);
      })
    }
    socket.on('gameCreated', data => {
      this.props.drawBoard(data.board); // if the server sends an object, it means that the player is player 2
      this.props.setGameIndex(data.gameIndex); // if so, set game index
      this.props.selectHex({}); // initialize selected hex
      this.props.highlightNeighbors([]); // and neighbors
      !this.props.playerAssigned && this.props.setUserPlayer('player2'); // and set player to player2
    });
    socket.on('move', (move) => { // when socket receives result of move request,
      this.props.moveUnits(move.updatedOrigin, move.originIndex, move.updatedTarget, move.targetIndex); // it passes to move function
      this.nextTurn(); // then flips turn to next turn, which also triggers reinforce/supply
    });
    this.props.socket.on('updateResources', data => {
      this.props.updateResources(data.playerOneResources, data.playerTwoResources);
    })
    this.props.socket.on('swordsmen', () => {
      this.props.swordsmen(this.props.currentPlayer);
    });
    this.props.socket.on('archers', () => {
      this.props.archers(this.props.currentPlayer);
    });
    this.props.socket.on('knights', () => {
      this.props.knights(this.props.currentPlayer);
    });
    socket.on('win', () => {
      alert('You win!');
    });
    socket.on('lose', () => {
      alert('You lose!');
    });
    socket.on('failure', () => { // should only happen if the server finds that its board state does not match what the client sends w/ request
      alert('aaaaaaaaaaaaaaaaaaaaah cheating detected aaaaaaaaaaaaaaaah')
    });
  }

  closeModal() {
    this.setState({ modalOpen: false });
  }

  validateTroopAmounts() {
    // check current hex and make sure the ammounts arent greater
    const resetState = () => {
      this.setState({
        tempArchers: 0,
        tempKnights: 0,
        tempSwordsmen: 0
      })
    }
    let hex = this.props.selectedHex;
    if (hex.swordsmen < this.state.tempSwordsmen || hex.archers < this.state.tempArchers || hex.knights < this.state.tempKnights) {
      resetState();
      alert('you cannot enter a number higher of units than you currently have');
      return false;
    } else {
      this.handleMoveClick(this.state.hex);
      this.setState({
        modalOpen: false
      })
    }
  }

  handleClick(hex) {
    if (!this.props.selectedHex.hasOwnProperty('index') || this.props.selectedHex.index === hex.index) { // since selected hex is either empty object or hex, check if hex is selected and if click is on selected hex
      this.handleSelectClick(hex); // if either of these, reoute to select click function
    } else {
      this.setState({
        confirmOpen: true
      })
    }
  }

  handleSelectClick(hex) {
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
      this.props.highlightNeighbors(neighbors); // dispatch neighbors array to reducer\
    }
  }

  handleMoveClick(hex) { // if move click,
    // need to first check if player has units to move
    if (this.props.neighbors.indexOf(hex.index) > -1 && (this.state.tempArchers > 0 ||
      this.state.tempKnights > 0 || this.state.tempSwordsmen > 0)) { // check if clicked hex is a neighbor
      let board = this.props.boardState;
      let origin = this.props.selectedHex;
      let originIndex = board.indexOf(origin); // grab index of hex in board state array for replacement in reducer
      let targetIndex = board.indexOf(hex); // same for target
      let target = board[targetIndex];

      let updatedTarget = { // create copy of target hex
        ...target,
        swordsmen: target.player && target.player === this.props.userPlayer ? target.swordsmen += this.state.tempSwordsmen : this.state.tempSwordsmen,
        archers: target.player && target.player === this.props.userPlayer ? target.archers += this.state.tempArchers : this.state.tempArchers,
        knights: target.player && target.player === this.props.userPlayer ? target.knights += this.state.tempKnights : this.state.tempKnights,
        player: this.props.userPlayer
      }
      let updatedOrigin = { // reinitialize hex they left
        ...origin,
        swordsmen: origin.swordsmen -= this.state.tempSwordsmen,
        archers: origin.archers -= this.state.tempArchers,
        knights: origin.knights -= this.state.tempKnights,
      }

      if (updatedOrigin.swordsmen === 0 && updatedOrigin.archers === 0 && updatedOrigin.knights === 0) {
        updatedOrigin.player = null
      }

      this.setState({
        confirmOpen: false
      })

      this.sendMoveRequest(updatedOrigin, originIndex, updatedTarget, targetIndex); // send information to be sent over socket
    } else { //  if selected hex is not a neighbor,
      alert('Please select a valid move.') // alert player they can't move there
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
      <div>
        <Button style={{float: 'left', zIndex: '100', position: 'fixed', bottom: '50px', left: '35px'}} onClick={this.props.menuToggle}>Menu</Button>
        <SidebarLeft />
        <TopBar />
        <div className="Board">
          <HexGrid height={800} viewBox="-50 -50 150 150">
            <Layout size={{ x: 11, y: 11 }} flat={false} spacing={1.2} origin={{ x: 7.5, y: -30 }}>
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
                  onClick={() => {
                    this.handleClick(hex);
                    this.setState({ hex: hex });
                  }}
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
              }): <div></div>}
            </Layout>
          </HexGrid>
          <Confirm
            open={this.state.confirmOpen}
            size={'tiny'}
            content={'Move all your troops on this hex?'}
            cancelButton={'No, only some'}
            onCancel={() => {
              this.setState({ modalOpen: true })
              this.setState({ confirmOpen: false })
            }}
            confirmButton={'Yes'}
            onConfirm={async () => {
              await this.setState({
                tempSwordsmen: this.props.selectedHex.swordsmen,
                tempArchers: this.props.selectedHex.archers,
                tempKnights: this.props.selectedHex.knights
              })
              this.handleMoveClick(this.state.hex);
            }}/>
          <Modal open={this.state.modalOpen} size={'small'}
            style={{ textAlign: 'center' }} closeIcon onClose={this.closeModal.bind(this)}>
            <Modal.Header>Move Troops</Modal.Header>
            <Modal.Content>
              <Modal.Description>
                <Form size={'small'} key={'small'}>
                  <Form.Group widths='equal'>
                    <Form.Field onChange={(e) => {this.setState({ tempSwordsmen: Number(e.target.value) })}} label='Swordsmen' control='input' placeholder='number' />
                    <Form.Field onChange={(e) => {this.setState({ tempArchers: Number(e.target.value) })}} label='Archers' control='input' placeholder='number' />
                    <Form.Field onChange={(e) => {this.setState({ tempKnights: Number(e.target.value) })}} label='Knights' control='input' placeholder='number' />
                  </Form.Group>
                  <Divider hidden />
                </Form>
              </Modal.Description>
            </Modal.Content>
            <Modal.Actions>
              <Button type='submit' onClick={this.validateTroopAmounts.bind(this)}>Move</Button>
            </Modal.Actions>
          </Modal>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  console.log('SOCKET IN THE BOARD: ', state.state.socket.id)
  return {
    socket: state.state.socket,
    room: state.state.room,
    boardState: state.state.boardState,
    neighbors: state.state.neighbors,
    selectedHex: state.state.selectedHex,
    gameIndex: state.state.gameIndex,
    currentPlayer: state.state.currentPlayer,
    playerAssigned: state.state.playerAssigned,
    userPlayer: state.state.userPlayer,
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ setRoom, menuToggle, setUserPlayer, selectHex,
    highlightNeighbors, drawBoard, highlightOpponents, moveUnits, reinforceHex,
    updateResources, swordsmen, archers, knights, switchPlayer, setGameIndex, setPlayerOne, setPlayerTwo }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Board);
