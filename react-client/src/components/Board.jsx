import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { Segment, Confirm, Button, Header, Popup, Image, Modal, Content, Description, Sidebar, Menu, Transition,
         Icon, Form, Checkbox, Divider, Label, Grid, Radio } from 'semantic-ui-react';
import { warningOpen, forfeitOpen, setSpectator, setLoggedInPlayer, addUnitsToHex, updateBank, setRoom, setSocket, menuToggle, setUserPlayer, selectHex, highlightNeighbors,
         highlightOpponents, moveUnits, reinforceHex, updateResources, swordsmen, iconsToggle,
         archers, knights, updateUnitCounts, switchPlayer, drawBoard, setGameIndex, resetBoard, setPlayerOne, setPlayerTwo, botMove } from '../../src/actions/actions.js';
import axios from 'axios';
import socketIOClient from "socket.io-client";
const uuidv4 = require('uuid/v4');
import SidebarLeft from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import DefaultState from '../store/DefaultState.js';
import UnitShop from './UnitShop.jsx';
import OpponentBank from './OpponentBank.jsx';
import ChatWindow from './ChatWindow.jsx';
import hexbot from '../hexbot/hexbot.js';
import TimeoutModals from './TimeoutModals.jsx';

let interval;

class Board extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hex: null,
      moveModalOpen: false,
      combatModalOpen: false,
      combatMessage: 'May the strongest prevail!',
      combatIcon: './images/battle.jpg',
      confirmOpen: false,
      disconnectModalOpen: false,
      tempSwordsmen: 0,
      tempArchers: 0,
      tempKnights: 0,
      timer:0,
      turnsForfeited: 0,
      hexbotModalOpen: false,
      genericModalOpen: false,
      genericModalHeader: 'test',
      genericModalFalse: 'test',
    }
  }

  componentDidMount() {
    (async () => {
      let socket = this.props.socket;
      if (this.props.location.state && this.props.location.state.type) {
        await this.props.setSpectator(true);
        socket.emit('watchGame', {
          room: this.props.location.state ? this.props.location.state.detail : window.location.href.split('?')[1],
          username: this.props.loggedInUser,
          gameIndex: this.props.location.state.gameIndex
        })
        this.props.setRoom(this.props.location.state ? this.props.location.state.detail : window.location.href.split('?')[1]);
      } else if (!this.props.location.state || this.props.location.state.extra === 'join' && !this.props.location.state.type) {
        if (!socket) {
          socket = await socketIOClient('http://127.0.0.1:8080');
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

      socket.on('loadGameBoard', data => {
        this.props.drawBoard(data.game); // inits the board from last saved state
        this.props.setGameIndex(data.game.gameIndex); // sets original game index
        this.props.selectHex({}); // initialize selected hex
        this.props.highlightNeighbors([]); // and neighbors
        this.props.setRoom(data.game.room); // sets the room
        this.props.updateUnitCounts(data.game.playerOneTotalUnits, data.game.playerTwoTotalUnits); // retrieves players resource counts
        this.props.updateBank(data.game.playerOneUnitBank, data.game.playerTwoUnitBank); // retrieves players units in the bank
        this.props.setUserPlayer(`${data.game.userPlayer}`); // sets the current user
        this.props.switchPlayer(`${data.game.currentPlayer}`); // sets the current player's turn
      });

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
        });
        interval = setInterval(() => {
          this.setState({
            timer: this.state.timer += 1
          })
        }, 1000)
      });

      socket.on('move', (move) => { // when socket receives result of move request,
        if (this.props.hexbot && this.props.currentPlayer === 'player2') {
          // this.hexbotIsThinking();
          setTimeout(() => {
            this.props.botMove(move.updatedOrigin, move.originIndex, move.updatedTarget, move.targetIndex);
            if (move.tie) {
              setTimeout(() => this.setState({
                combatMessage: 'Combat ends in a bitter draw.',
                combatIcon: './images/white-flag.jpg'
              }), 2500);
              setTimeout(() => this.resetCombatModal(), 5001);
            }
            if (move.updatedUnitCounts) {
              this.props.updateUnitCounts(move.updatedUnitCounts.playerOneTotalUnits, move.updatedUnitCounts.playerOneTotalUnits);
            }
            this.props.updateResources(move.playerOneResources, move.playerTwoResources);
            this.nextTurn(); // then flips turn to next turn, which also triggers reinforce/supply
            
            if (this.props.useTimer) {
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
            }
          }, 2000);
        } else {
          this.props.moveUnits(move.updatedOrigin, move.originIndex, move.updatedTarget, move.targetIndex); // it passes to move function
          if (move.tie) {
            setTimeout(() => this.setState({
              combatMessage: 'Combat ends in a bitter draw.',
              combatIcon: './images/white-flag.jpg'
            }), 2500);
            setTimeout(() => this.resetCombatModal(), 5001);
          }
          if (move.updatedUnitCounts) {
            this.props.updateUnitCounts(move.updatedUnitCounts.playerOneTotalUnits, move.updatedUnitCounts.playerOneTotalUnits);
          }
          this.props.updateResources(move.playerOneResources, move.playerTwoResources);
          this.nextTurn(); // then flips turn to next turn, which also triggers reinforce/supply
          if (this.props.useTimer) {
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
          }
        }
      });
      
      if (this.props.useTimer) {
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
        }, 1000);
      }
      
      socket.on('watchGame', data => {
        this.props.setSpectator(this.props.loggedInUser);
      })
      socket.on('setLoggedInUser', data => {
        this.props.setLoggedInPlayer(data.player1, data.player2);
      })
      socket.on('combat', () => {
        if (this.props.hexbot && this.props.currentPlayer === 'player2') {
          setTimeout(() => {
            this.setState({ combatModalOpen: true });
            setTimeout(() => this.setState({ combatModalOpen: false }), 5000);
          }, 2000);
        } else {
          this.setState({ combatModalOpen: true });
          setTimeout(() => this.setState({ combatModalOpen: false }), 5000);
        }
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
        this.props.addUnitsToHex(data.hex, data.hexIndex, data.hex.player);
      })
      socket.on('combatWin', (data) => {
        let combatMessage;
        this.props.loggedInUser.slice(this.props.loggedInUser.length - 9) === 'spectator' ?
          combatMessage = `${data} is victorious!` :
          combatMessage = 'You are victorious!';
        setTimeout(() => this.setState({
          combatMessage: combatMessage,
          combatIcon: './images/victory.jpg'
        }), 2500);
        setTimeout(() => this.resetCombatModal(), 5001);
      });
      socket.on('combatLoss', (data) => {
        let combatMessage;
        this.props.loggedInUser.slice(this.props.loggedInUser.length - 9) === 'spectator' ?
          combatMessage = `${data} is victorious!` :
          combatMessage = 'Your armies have been bested.';
        setTimeout(() => this.setState({
          combatMessage: combatMessage,
          combatIcon: './images/loss.png'
        }), 2500);
        setTimeout(() => this.resetCombatModal(), this.props.hexbot && this.props.currentPlayer === 'player2' ? 7001 : 5001);
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
          combatIcon: './images/game-victory.jpg'
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
          combatIcon: './images/game-loss.png'
        }), this.props.hexbot && this.props.currentPlayer === 'player2' ? 4500 : 2500);
        setTimeout(() => this.resetCombatModal(), this.props.hexbot && this.props.currentPlayer === 'player2' ? 7001 : 5001);
      });

      socket.on('failure', () => { // should only happen if the server finds that its board state does not match what the client sends w/ request
        this.setState({
          genericModalOpen: true,
          genericModalHeader: 'Cheating Detected',
          genericModalMessage: 'You are being redirected to the home page. Please don\'t cheat, it makes Hexbot sad :('
        })
        setTimeout(() => {
          this.props.history.push('/');
          this.props.resetBoard();
        }, 2500);
      });
      socket.on('disconnect', () => {
        clearInterval(interval);
        this.setState({ disconnectModalOpen: true });
        setTimeout(() => {
          this.props.history.push('/');
          this.props.resetBoard();
        }, 2500);
      })
    })();
  }

  componentWillUnmount() {
    this.setState({
      timer: null
    });
    clearInterval(interval);
  }

  resetCombatModal() {
    this.setState({
      combatMessage: 'May the strongest prevail!',
      combatIcon: './images/battle.jpg',
    });
  }

  resetGenericModal() {
    this.setState({
      genericModalHeader: '',
      genericModalMessage: '',
    });
  }

  closeMoveModal() {
    this.setState({ moveModalOpen: false });
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
      this.setState({
        genericModalOpen: true,
        genericModalHeader: 'Invalid Number',
        genericModalMessage: 'Please select a number of units less than or equal to the number units on the hex.'
      })
      return false;
    } else {
      this.handleMoveClick(this.state.hex);
      this.setState({
        moveModalOpen: false
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
      this.setState({
        genericModalOpen: true,
        genericModalHeader: 'Invalid Move',
        genericModalMessage: 'Please select a hex contiguous with one of the hexes you control.'
      }) // alert player they can't move there
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
    if (this.props.hexbot && this.props.currentPlayer === 'player2') {
      this.state.combatModalOpen ? setTimeout(() => hexbot(), 5000) : hexbot();
    }
  }

  render() {
    return (
      <div>
        {this.props.icons ?
          <Label style={{float: 'left', zIndex: '10000', position: 'fixed', bottom: '130px', left: '47.5px'}}>Colors</Label> :
          <Label style={{float: 'left', zIndex: '10000', position: 'fixed', bottom: '130px', left: '50px'}}>Icons</Label>
        }
        <Radio style={{float: 'left', zIndex: '10000', position: 'fixed', bottom: '100px', left: '50px'}} onClick={this.props.iconsToggle} toggle/>
        <Button style={{float: 'left', zIndex: '10000', position: 'fixed', bottom: '50px', left: '35px'}} onClick={this.props.menuToggle} >Menu</Button>
        <Grid>

          <Grid.Column width={2}>
            <SidebarLeft />
          </Grid.Column>

          <Grid.Row>
            <Grid.Column width={2}>
              <SidebarLeft />
            </Grid.Column>
            <Grid.Column width={16}>
              <TopBar otherPlayer={this.props.location.state}/>
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width={this.props.menuVisible ? 14 : 15}>
              <div className="Board">
                <HexGrid height={800} viewBox="-50 -50 150 150">
                  <Layout size={{ x: 12, y: 12 }} flat={false} spacing={1.2} origin={{ x: 7.5, y: -35 }}>
                    {this.props.boardState ? this.props.boardState.map((hex, index) => {
                      let targetClass = '';
                      if (hex.hasGold) {
                        targetClass += ' gold';
                      } else if (hex.hasWood) {
                        targetClass += ' wood';
                      } else if (hex.hasMetal) {
                        targetClass += ' metal';
                      }
                      if (this.props.neighbors.indexOf(hex.index) > -1) {
                        targetClass += ' neighbor';
                      }
                      if ((!this.props.spectator && hex.player !== null && hex.player !== this.props.userPlayer) || (this.props.spectator && hex.player === 'player2')) { // logic for assigning CSS classes
                        targetClass += ' opponent';
                      } else if (this.props.selectedHex.index === hex.index) {
                        targetClass += ' selected';
                      } else if (hex.player === this.props.userPlayer || (this.props.spectator && hex.player === 'player1')) {
                        targetClass += ' friendly';
                      }
                      if (hex.player === this.props.userPlayer && this.props.deployment && this.props.deployment.unit === 'swordsmen') {
                        targetClass += ' swordsmen';
                      } else if (hex.player === this.props.userPlayer && this.props.deployment && this.props.deployment.unit === 'archers') {
                        targetClass += ' archer';
                      } else if (hex.player === this.props.userPlayer && this.props.deployment && this.props.deployment.unit === 'knights') {
                        targetClass += ' knight';
                      }
                      let hexagon = this.props.icons ?
                      <Hexagon
                        key={uuidv4()}
                        onClick={() => {
                          this.props.deployment && hex.player === this.props.userPlayer ? this.addUnitsToHex(index, hex) :
                          this.handleClick(hex);
                          this.setState({ hex: hex });
                        }}
                        className={targetClass.indexOf('neighbor') > -1 && targetClass.indexOf('opponent') > -1 ? 'opponentIcon' :
                                   targetClass.indexOf('neighbor') > -1 ? 'neighborIcon' : null}
                        fill={targetClass.indexOf('gold') > -1 && targetClass.indexOf('neighbor') > -1 ? 'gold-bar-neighbor' :
                              targetClass.indexOf('wood') > -1 && targetClass.indexOf('neighbor') > -1 ? 'wood-pile-neighbor' :
                              targetClass.indexOf('metal') > -1 && targetClass.indexOf('neighbor') > -1 ? 'metal-bar-neighbor' :
                              targetClass.indexOf('opponent') > -1 && targetClass.indexOf('neighbor') > -1 ? 'opponent-neighbor' :
                              targetClass.indexOf('gold') > -1 && targetClass.indexOf('opponent') > -1 ? 'gold-bar-opponent' :
                              targetClass.indexOf('wood') > -1 && targetClass.indexOf('opponent') > -1 ? 'wood-pile-opponent' :
                              targetClass.indexOf('metal') > -1 && targetClass.indexOf('opponent') > -1 ? 'metal-bar-opponent' :
                              targetClass.indexOf('gold') > -1 && targetClass.indexOf('friendly') > -1 ? 'gold-bar-friendly' :
                              targetClass.indexOf('wood') > -1 && targetClass.indexOf('friendly') > -1 ? 'wood-pile-friendly' :
                              targetClass.indexOf('metal') > -1 && targetClass.indexOf('friendly') > -1 ? 'metal-bar-friendly' :
                              targetClass.indexOf('neighbor') > -1 ? 'neighbor' :
                              targetClass.indexOf('selected') > -1 ? 'friendly-selected' :
                              targetClass.indexOf('gold') > -1 ? 'gold-bar' :
                              targetClass.indexOf('wood') > -1 ? 'wood-pile' :
                              targetClass.indexOf('metal') > -1 ? 'metal-bar' :
                              targetClass.indexOf('friendly') > -1 ? 'friendly' :
                              targetClass.indexOf('opponent') > -1 ? 'opponent' :
                              null}
                        q={hex.coordinates[0]}
                        r={hex.coordinates[1]}
                        s={hex.coordinates[2]}>
                        <Text>
                          {`${hex.swordsmen.toString()}, ${hex.archers.toString()}, ${hex.knights.toString()}`}
                        </Text>
                      </Hexagon> :
                      <Hexagon
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
                      </Hexagon>;
                      return hexagon;
                    }): <div></div>}
                  </Layout>
                  <Pattern id="gold-bar" link="./images/gold-bar.svg" />
                  <Pattern id="wood-pile" link="./images/wood-pile.svg" />
                  <Pattern id="metal-bar" link="./images/metal-bar.svg" />
                  <Pattern id="friendly" link="./images/friendly.svg" />
                  <Pattern id="opponent" link="./images/opponent.svg" />
                  <Pattern id="neighbor" link="./images/neighbor.svg" />
                  <Pattern id="friendly-selected" link="./images/friendly-selected.svg" />
                  <Pattern id="gold-bar-neighbor" link="./images/gold-bar-neighbor.svg" />
                  <Pattern id="wood-pile-neighbor" link="./images/wood-pile-neighbor.svg" />
                  <Pattern id="metal-bar-neighbor" link="./images/metal-bar-neighbor.svg" />
                  <Pattern id="opponent-neighbor" link="./images/opponent-neighbor.svg" />
                  <Pattern id="gold-bar-friendly" link="./images/gold-bar-friendly.svg" />
                  <Pattern id="gold-bar-opponent" link="./images/gold-bar-opponent.svg" />
                  <Pattern id="wood-pile-friendly" link="./images/wood-pile-friendly.svg" />
                  <Pattern id="wood-pile-opponent" link="./images/wood-pile-opponent.svg" />
                  <Pattern id="metal-bar-friendly" link="./images/metal-bar-friendly.svg" />
                  <Pattern id="metal-bar-opponent" link="./images/metal-bar-opponent.svg" />
                </HexGrid>
                <Confirm
                  open={this.state.confirmOpen}
                  size={'tiny'}
                  content={'Move all your troops to this hex?'}
                  cancelButton={'No, only some'}
                  onCancel={() => {
                    this.setState({ moveModalOpen: true })
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

                <Modal open={this.state.moveModalOpen} size={'small'}
                    style={{ textAlign: 'center' }} closeIcon onClose={this.closeMoveModal.bind(this)}>
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
                <OpponentBank />
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
        <Transition animation={'fade up'} duration={'1500'} visible={this.props.hexbotModalOpen}>
          <Modal open={this.props.hexbotModalOpen} size={'small'} style={{ textAlign: 'center' }}>
            <Modal.Header>
              <Image style={{maxHeight: '200px', display: 'inline'}} src={'./images/hexbot.jpg'} />
              Hexbot is thinking...
            </Modal.Header>
            <Modal.Content>
              <Segment>
                <Image style={{maxHeight: '400px', margin: 'auto'}} src={'./images/gears.gif'}/>
              </Segment>
            </Modal.Content>
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
        <Transition animation={'fade up'} duration={'1000'} visible={this.state.genericModalOpen}>
          <Modal
            open={this.state.genericModalOpen}
            closeIcon
            onClose={() => {
              this.setState({ genericModalOpen: false });
              this.resetGenericModal();
            }}
            size={'small'}
            style={{ textAlign: 'center' }}
          >
            <Modal.Header>{this.state.genericModalHeader}</Modal.Header>
            <Modal.Content>
              {this.state.genericModalMessage}
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
    hexbot: state.state.hexbot,
    hexbotModalOpen: state.state.hexbotModalOpen,
    icons: state.state.icons,
    useTimer: state.state.useTimer
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ warningOpen, forfeitOpen, setSpectator, setLoggedInPlayer, addUnitsToHex, updateBank, setSocket, setRoom, menuToggle, setUserPlayer, selectHex,
    highlightNeighbors, drawBoard, highlightOpponents, moveUnits, reinforceHex, iconsToggle,
    updateResources, swordsmen, archers, knights, updateUnitCounts, switchPlayer,
    setGameIndex, resetBoard, setPlayerOne, setPlayerTwo, botMove }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Board);
