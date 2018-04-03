import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { Segment, Confirm, Button, Header, Popup, Image, Modal, Content, Description, Sidebar, Menu, Transition,
         Icon, Form, Checkbox, Divider, Label, Grid, } from 'semantic-ui-react';
import { warningOpen, forfeitOpen, setSpectator, setLoggedInPlayer, addUnitsToHex, updateBank, setRoom, setSocket, menuToggle, setUserPlayer, selectHex, highlightNeighbors,
         highlightOpponents, moveUnits, reinforceHex, updateResources, swordsmen,
         archers, knights, updateUnitCounts, switchPlayer, drawBoard, setGameIndex, resetBoard } from '../../src/actions/actions.js';
import axios from 'axios';
import socketIOClient from "socket.io-client";
const uuidv4 = require('uuid/v4');
import SidebarLeft from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import DefaultState from '../store/DefaultState.js';
import UnitShop from './UnitShop.jsx';
import UnitBank from './UnitBank.jsx';
import ChatWindow from './ChatWindow.jsx';
import hexbot from '../hexbot/hexbot.js';
import TimeoutModals from './TimeoutModals.jsx';

class Board extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hex: null,
      modalOpen: false,
      combatModalOpen: false,
      combatMessage: 'May the strongest prevail!',
      combatIcon: 'http://powerpictures.crystalgraphics.com/photo/crossed_swords_isolated_on_white_duel_symbol_cg2p03692744c_th.jpg',
      confirmOpen: false,
      disconnectModalOpen: false,
      tempSwordsmen: 0,
      tempArchers: 0,
      tempKnights: 0,
      timer:0,
      turnsForfeited: 0
    }
  }

  componentDidMount() {
    let interval;
    (async () => {
      let socket = this.props.socket;
      if (this.props.location.state.type) {
        await this.props.setSpectator(true);
        socket.emit('watchGame', {
          room: this.props.location.state ? this.props.location.state.detail : window.location.href.split('?')[1],
          username: this.props.loggedInUser,
          gameIndex: this.props.location.state.gameIndex
        })
        this.props.setRoom(this.props.location.state ? this.props.location.state.detail : window.location.href.split('?')[1]);
      } else if (!this.props.location.state || this.props.location.state.extra === 'join' && !this.props.location.state.type) {
        if (!socket) {
          socket = await socketIOClient('0.0.0.0');
          this.props.setSocket(socket);
        }
        socket.emit('joinGame', {
          room: this.props.location.state ? this.props.location.state.detail : window.location.href.split('?')[1],
          username: this.props.loggedInUser,
          spectator: true
        });
        !this.props.playerAssigned && this.props.setUserPlayer('player2');
        this.props.setRoom(this.props.location.state ? this.props.location.state.detail : window.location.href.split('?')[1]);        
      } else if (this.props.location.state.extra === 'create') {
        !this.props.playerAssigned && this.props.setUserPlayer('player1');
      }
      socket.on('gameCreated', data => {
        this.props.drawBoard(data); // if the server sends an object, it means that the player is player 2
        this.props.setGameIndex(data.gameIndex); // if so, set game index
        this.props.selectHex({}); // initialize selected hex
        this.props.highlightNeighbors([]); // and neighbors
        this.props.user ? null : this.props.updateUnitCounts(10, 10);
        this.props.switchPlayer('player1');
        !this.props.spectator && !this.props.playerAssigned && this.props.setUserPlayer('player2'); // and set player to player2
        !this.props.spectator && socket.emit('setLoggedInUser', {
          username: this.props.loggedInUser,
          player: this.props.userPlayer,
          gameIndex: data.gameIndex,
          room: data.room
        })
        interval = setInterval(() => {
          this.setState({
            timer: this.state.timer += 1
          })
        }, 1000)
      });
      socket.on('move', (move) => { // when socket receives result of move request,
        this.props.moveUnits(move.updatedOrigin, move.originIndex, move.updatedTarget, move.targetIndex); // it passes to move function
        if (move.tie) {
          this.setState({
            combatModalOpen: true,
          });
          setTimeout(() => this.setState({
            combatMessage: 'Combat ends in a bitter draw.',
            combatIcon: 'http://redironbrand.com/359-thickbox_default/-golf-pin-flag.jpg'
          }), 2500);
          setTimeout(() => this.resetCombatModal(), 5001);
        }
        if (move.updatedUnitCounts) {
          this.props.updateUnitCounts(move.updatedUnitCounts.playerOneTotalUnits, move.updatedUnitCounts.playerOneTotalUnits);
        }
        this.props.updateResources(move.playerOneResources, move.playerTwoResources);
        this.nextTurn(); // then flips turn to next turn, which also triggers reinforce/supply
        clearInterval(interval);
        this.setState({
          timer: 0
        }, () => {
          interval = setInterval(() => {
              this.setState({
                timer: this.state.timer += 1
              })
            }, 1000)
            
        })
      });

      setInterval(async () => {
        if (this.state.timer === 90) {
          if (this.props.userPlayer === this.props.currentPlayer) {
            this.props.warningOpen(true);
            setTimeout(() => this.props.warningOpen(false), 3000);
          }
        } else if (this.state.timer > 120) {
          this.props.forfeitOpen(true);
          setTimeout(() => this.props.forfeitOpen(false), 3000);
          await this.nextTurn();
          await this.setState({
            timer: 0
          })

        }
      }, 1000)

      socket.on('watchGame', data => {
        this.props.setSpectator(this.props.loggedInUser);
      })
      socket.on('setLoggedInUser', data => {
        this.props.setLoggedInPlayer(data.player1, data.player2);
      })
      socket.on('combat', () => {
        this.setState({ combatModalOpen: true });
        setTimeout(() => this.setState({ combatModalOpen: false }), 5000);
      })
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
      socket.on('troopsDeployed', data => {
        this.props.addUnitsToHex(data.hex, data.hexIndex, this.props.userPlayer);
      })
      socket.on('combatWin', (data) => {
        let combatMessage;
        this.props.loggedInUser.slice(this.props.loggedInUser.length - 9) === 'spectator' ?
          combatMessage = `${data} is victorious!` :
          combatMessage = 'You are victorious!';
        setTimeout(() => this.setState({
          combatMessage: combatMessage,
          combatIcon: 'https://royalarmouries.files.wordpress.com/2015/10/di-2015-3939.jpg'
        }), 2500);
        setTimeout(() => this.resetCombatModal(), 5001);
      });
      socket.on('combatLoss', (data) => {
        this.props.loggedInUser.slice(this.props.loggedInUser.length - 9) === 'spectator' ?
          combatMessage = `${data} is victorious!` :
          combatMessage = 'Your armies have been bested.';
        setTimeout(() => this.setState({
          combatMessage: combatMessage,
          combatIcon: 'https://upload.wikimedia.org/wikipedia/en/c/c9/Black_Knight_Holy_Grail.png'
        }), 2500);
        setTimeout(() => this.resetCombatModal(), 5001);
      })
      socket.on('tieGame', () => {
        let tag;
        this.props.loggedInUser.slice(this.props.loggedInUser.length - 9) === 'spectator' ?
          '' : tag = 'Try again';
        setTimeout(() => {
          this.setState({ combatMessage: `The war has ended in a stalemate. ${tag}`});
        }, 2500);
        setTimeout(() => this.resetCombatModal(), 5001);
      })
      socket.on('winGame', (data) => {
        let combatMessage;
        this.props.loggedInUser.slice(this.props.loggedInUser.length - 9) === 'spectator' ?
          combatMessage = `${data} wins the battle and the day!` :
          combatMessage = 'Congratulations! You have won the battle, and the day!';
        setTimeout(() => this.setState({
          combatMessage: combatMessage,
          combatIcon: 'https://i.pinimg.com/originals/4c/a1/d5/4ca1d5daf9d24d341fe3f9d346bb98ba.jpg'
        }), 2500);
        setTimeout(() => this.resetCombatModal(), 5001);
      });
      socket.on('loseGame', (data) => {
        let combatMessage;
        this.props.loggedInUser.slice(this.props.loggedInUser.length - 9) === 'spectator' ?
          combatMessage = data + ' wins the battle and the day!' :
          combatMessage = 'Your armies have been bested, and your enemy is victorious. Better luck next time.';
        setTimeout(() => this.setState({
          combatMessage: combatMessage,
          combatIcon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Skull_and_crossbones.svg/2000px-Skull_and_crossbones.svg.png'
        }), 2500);
        setTimeout(() => this.resetCombatModal(), 5001);
      });
 
      socket.on('failure', () => { // should only happen if the server finds that its board state does not match what the client sends w/ request
        alert('aaaaaaaaaaaaaaaaaaaaah cheating detected aaaaaaaaaaaaaaaah')
      });
      socket.on('disconnect', () => {
        this.setState({ disconnectModalOpen: true });
        setTimeout(() => {
          this.props.history.push('/');
          this.props.resetBoard();
        }, 2500);
      })
    })();
  }

  resetCombatModal() {
    this.setState({
      combatMessage: 'May the strongest prevail!',
      combatIcon: 'http://powerpictures.crystalgraphics.com/photo/crossed_swords_isolated_on_white_duel_symbol_cg2p03692744c_th.jpg',
    })
  }

  closeModal() {
    this.setState({ modalOpen: false });
  }

  skipCombatAnmiation() {
    this.setState({ combatModalOpen: false })
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

  addUnitsToHex(hexIndex, hex) {
    this.props.socket.emit('addUnits', {
      hexIndex: hexIndex,
      unit: this.props.deployment.unit,
      player: this.props.userPlayer,
      quantity: this.props.deployment.quantity,
      gameIndex: this.props.gameIndex,
      room: this.props.room,
      hexLongIndex: hex.index
    })
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
    this.props.boardState ? hexbot() : null;
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
        <Grid>
          <Grid.Row>
            <Grid.Column width={2}>
              <SidebarLeft />
            </Grid.Column>
            <Grid.Column width={16}>
              <TopBar />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width={this.props.menuVisible ? 14 : 15}>
              <div className="Board">
                <HexGrid height={800} viewBox="-50 -50 150 150">
                  <Layout size={{ x: 11, y: 11 }} flat={false} spacing={1.2} origin={{ x: 7.5, y: -30 }}>
                    {this.props.boardState ? this.props.boardState.map((hex, index) => {
                      let targetClass = '';
                      if ((!this.props.spectator && hex.player !== null && hex.player !== this.props.userPlayer) || (this.props.spectator && hex.player === 'player2')) { // logic for assigning CSS classes
                        targetClass += 'opponent';
                      } else if (this.props.selectedHex.index === hex.index) {
                        targetClass += 'selected';
                      } else if (hex.player === this.props.userPlayer || (this.props.spectator && hex.player === 'player1')) {
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
                      if (hex.player === this.props.userPlayer && this.props.deployment && this.props.deployment.unit === 'swordsmen') {
                        targetClass += ' swordsmen';
                      } else if (hex.player === this.props.userPlayer && this.props.deployment && this.props.deployment.unit === 'archers') {
                        targetClass += ' archer';
                      } else if (hex.player === this.props.userPlayer && this.props.deployment && this.props.deployment.unit === 'knights') {
                        targetClass += ' knight';
                      }
                      return <Hexagon
                        key={uuidv4()}
                        className={targetClass}
                        onClick={() => {
                          this.props.deployment && hex.player === this.props.userPlayer ? this.addUnitsToHex(index, hex) :
                          this.handleClick(hex);
                          this.setState({ hex: hex });
                        }}
                        q={hex.coordinates[0]}
                        r={hex.coordinates[1]}
                        s={hex.coordinates[2]}>
                        <Text>
                          {`${hex.swordsmen.toString()}, ${hex.archers.toString()}, ${hex.knights.toString()}`}
                        </Text>
                      </Hexagon>
                    }): <div></div>}
                  </Layout>
                </HexGrid>
                <Confirm
                  open={this.state.confirmOpen}
                  size={'tiny'}
                  content={'Move all your troops to this hex?'}
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
              </Grid.Column>
              <Grid.Column width={2}>
                <ChatWindow/>
                {this.props.currentPlayer === this.props.userPlayer ?
                  <UnitBank />
                  : <div></div>
              }
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Transition animation={'jiggle'} duration={'2500'} visible={this.state.combatModalOpen}>
          <Modal open={this.state.combatModalOpen} size={'small'} style={{ textAlign: 'center' }}>
            <Modal.Header>{this.state.combatMessage}</Modal.Header>
              <Modal.Content>
                  <Segment>
                    <Image style={{maxWidth: '400px', margin: 'auto'}} src={this.state.combatIcon}/>
                  </Segment>
              </Modal.Content>
            <Modal.Actions>
              <Button type='submit' size={'tiny'} onClick={this.skipCombatAnmiation.bind(this)}>Skip</Button>
            </Modal.Actions>
          </Modal>
        </Transition>
        <Transition animation={'fade up'} duration={'3500'} visible={this.state.disconnectModalOpen}>
          <Modal open={this.state.disconnectModalOpen} size={'small'} style={{ textAlign: 'center' }}>
            <Modal.Header>Your opponent has left the room.</Modal.Header>
            <Modal.Content>
              You are being rerouted to the lobby.
            </Modal.Content>
          </Modal>
        </Transition>
        <TimeoutModals />
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
    playerTwoResources: state.state.playerTwoResources,
    deployment: state.state.deployment,
    menuVisible: state.state.menuVisible,
    loggedInUser: state.state.loggedInUser,
    playerOne: state.state.playerOne,
    playerTwo: state.state.playerTwo,
    spectator: state.state.spectator,
    hexbot: state.state.hexbot
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ warningOpen, forfeitOpen, setSpectator, setLoggedInPlayer, addUnitsToHex, updateBank, setSocket, setRoom, menuToggle, setUserPlayer, selectHex,
    highlightNeighbors, drawBoard, highlightOpponents, moveUnits, reinforceHex,
    updateResources, swordsmen, archers, knights, updateUnitCounts, switchPlayer,
    setGameIndex, resetBoard }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Board);
