import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { Segment, Button, Header, Popup, Image, Modal, Content, Description, Icon, Form, Checkbox, Divider, Label } from 'semantic-ui-react';
import { setSocket, setRoom, menuToggle, setUserPlayer, selectHex, highlightNeighbors, highlightOpponents, moveUnits, reinforceHex, switchPlayer, drawBoard, setGameIndex } from '../../src/actions/actions.js';
import axios from 'axios';
import socketIOClient from "socket.io-client";
const uuidv4 = require('uuid/v4');

import SidebarLeft from './Sidebar.jsx';
import TopBar from './TopBar.jsx';

class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      endpoint: "http://127.0.0.1:3000", // local host on local build, should be "/" for heroku deployment as sockets are hosted on root
      socket: null,
      room: null,
      open: false,
      tempSwordsmen: null,
      tempArchers: null,
      tempKnights: null
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

  close() {
    this.setState({ open: false });
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
    }
    this.setState({
      open: false
    })
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
      this.props.highlightNeighbors(neighbors); // dispatch neighbors array to reducer\
      this.setState({
        open: true
      })
    }
  }

  handleMoveClick(e, hex) { // if move click,,
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
        swordsmen: target.swordsmen += this.state.tempSwordsmen,
        archers: target.archers += this.state.tempArchers,
        knights: target.knights += this.state.tempKnights,
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
      <div>
        <Button style={{float: 'left', zIndex: '100', position: 'fixed', bottom: '50px', left: '35px'}} onClick={this.props.menuToggle}>Menu</Button>
        <SidebarLeft />
        <TopBar />
        <div className="Board flex" style={{float: 'right'}}>
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
          <Modal open={this.state.open} size={'small'}
            style={{ textAlign: 'center' }} closeIcon onClose={this.close.bind(this)}>
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
              <Button type='submit' onClick={this.validateTroopAmounts.bind(this)}>Submit</Button>
            </Modal.Actions>
          </Modal>
        </div>
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
    userPlayer: state.state.userPlayer,
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ setSocket, setRoom, menuToggle, setUserPlayer, selectHex, highlightNeighbors, drawBoard, highlightOpponents, moveUnits, reinforceHex, switchPlayer, setGameIndex }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(Board);
