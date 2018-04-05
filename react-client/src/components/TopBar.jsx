import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { List, Segment, Actions, Input, TextArea, Button, Header, Popup, Image, Modal, Content, Description, Icon, Form, Checkbox, Divider, Label, Confirm, Grid, Transition } from 'semantic-ui-react';
import { exitGame, setRoom, deleteRoom, resetBoard, setHexbot, callTimer } from '../../src/actions/actions.js';
import UnitShop from './UnitShop.jsx';
import DeployTroops from './DeployTroops.jsx';
import UserPlayerBank from './UserPlayerBank.jsx';

class TopBar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modalOpen: false,
      confirmOpen: false,
      saveOpen: false,
      email: '',
      message: '',
      inviteSent: false,
      buttonMessage: 'Invite',
      gameSaved: false,
      saveDisabled: false
    }

    this.saveGame = this.saveGame.bind(this);
    this.sendEmailToResume = this.sendEmailToResume.bind(this);
    this.confirm = this.confirm.bind(this);
    this.handleDontSave = this.handleDontSave.bind(this);
    this.handleSaveOnExit = this.handleSaveOnExit.bind(this);
    this.handleSaveClose = this.handleSaveClose.bind(this);
  }

  saveGame(exit) {
    this.props.socket.emit('saveGame', {
      gameIndex: this.props.gameIndex,
      room: this.props.room,
      socketId: this.props.socket.id
    });

    this.props.socket.on('saveGame', data => {
      this.setState({
        saveOpen: true,
        gameSaved: true,
        saveDisabled: true
      });
    });

    if (exit === 'saveOnExit') {
      this.exitGame('saveOnExit');
    }

  }

  handleSaveClose() {
    this.setState({ saveOpen: false });
  }

  confirm() {
    this.setState({ confirmOpen: true });
  }

  handleSaveOnExit() {
    this.saveGame('saveOnExit');
    this.setState({
      confirmOpen: false,
      gameSaved: true
    });
  }

  handleDontSave() {
    this.setState({ confirmOpen: false });
    this.exitGame();
  }

  exitGame(exit) {
    if (exit === 'saveOnExit') { // saves the game in the db on exit
      this.props.socket.emit('saveExit', {
        room: this.props.room,
        gameIndex: this.props.gameIndex,
        gameSaved: true
      });
      return;
    } 
    this.props.socket.emit('saveExit', {
      room: this.props.room,
      gameIndex: this.props.gameIndex,
      gameSaved: this.state.gameSaved
    });
  }

  sendEmail() {
    this.setState({ inviteSent: true, buttonMessage: 'Invite sent!' });
    this.props.socket.emit('sendEmail', {
      username: this.props.loggedInUser,
      email: this.state.email,
      message: this.state.message,
      room: this.props.room
    })
    setTimeout(() => this.setState({ modalOpen: false }), 2000);
  }

  sendEmailToResume() {
    this.setState({ inviteSent: true, buttonMessage: 'Invite sent!' });
    let messageDefault;
    messageDefault = this.state.message ? this.state.message : "Yo, let's finish our awesome game of Hexology!"
    this.props.socket.emit('sendEmail', {
      username: this.props.loggedInUser,
      email: this.props.location.state.otherPlayerInfo.email,
      message: messageDefault,
      room: this.props.room,
      gameIndex: this.props.gameIndex,
      otherUser: this.props.location.state.otherPlayerInfo.username
    })
    setTimeout(() => this.setState({ modalOpen: false }), 3000);
  }

  handleChange(e, {name, value}) {
    this.setState({ [name] : value })
  }

  render() {
    return (
      <Segment className={'topBar'} style={{display: 'block', width:this.props.menuVisible ? '80%' : '97%', marginBottom: '-20px' }} secondary floated={'right'} raised>
        <Header as='h1'>Hexology</Header>
        <div style={{right: '10px', top: '20px', position: 'absolute'}}>
          { (this.props.loggedInUser !== 'anonymous' && this.props.playerTwo !== 'anonymous' && !this.props.spectator && this.props.playerOneResources && this.props.playerOneResources.hasOwnProperty('wood')) || (this.props.location && this.props.location.search.includes('='))
            ? <Modal
              open={this.state.saveOpen}
              trigger={
                <Button 
                  size='small'
                  style={{marginRight: '5px'}}
                  onClick={this.saveGame}
                  disabled={this.state.saveDisabled}
                >Save Game</Button>}>
              <Modal.Content>Game Saved</Modal.Content>
              <Modal.Actions>
                <Button positive labelPosition='right' icon='checkmark' onClick={this.handleSaveClose} content='Cool' />
              </Modal.Actions>
            </Modal>
            : null
          }
          { (this.props.loggedInUser !== 'anonymous' && this.props.currentPlayer !== 'anonymous' && this.props.playerTwo !== 'anonymous' && !this.props.spectator && this.props.playerOneResources.hasOwnProperty('wood')) || (this.props.location && this.props.location.search.includes('='))
            ? <span>
                <Button size='small' onClick={this.confirm}>Exit Game</Button>
                <Confirm
                  header='Save Game?'
                  content="Do you want to save this game?"
                  cancelButton='No'
                  confirmButton="Yes"
                  open={this.state.confirmOpen}
                  onCancel={this.handleDontSave}
                  onConfirm={this.handleSaveOnExit}
                />
              </span>
            : <Button size='tiny' onClick={this.handleDontSave}>Exit Game</Button>
          }
        </div>
        <Header as='h4' style={{ marginTop: '-10px' }}>You are {this.props.userPlayer === 'player1' ? 'player one' : this.props.spectator ? 'spectating this game' : 'player two'}!</Header>

        {this.props.boardState ? null :
          (this.state.inviteSent ? <Segment>Invite sent to {this.state.email}</Segment> :
            <Segment>Want to play with a friend?
              <Button
                size={'tiny'}
                color={'blue'}
                compact
                style={{ marginLeft: '20px' }}
                onClick={() => this.setState({ modalOpen: true })}
              >
                Click Here
              </Button>
            </Segment>
          )
        }

        {this.props.location.state // if the game has been loaded by player
          ? ( this.props.location.state.gameLoad
              ? (this.state.inviteSent
                  ? null
                  : <Segment>Invite <strong>{this.props.location.state.otherPlayerInfo.username}</strong> to resume this game!
                    <Button
                      size={'tiny'}
                      color={'blue'}
                      compact
                      style={{ marginLeft: '20px' }}
                      onClick={() => this.setState({ modalOpen: true })}
                    >
                      Click Here
                    </Button>
                  </Segment>)
              : null)
          : null
        }

        <Segment.Group horizontal>
          {this.props.userPlayer && this.props.playerOneResources.hasOwnProperty('wood') ?
            <UserPlayerBank /> :
            <Segment>
              <strong>Player One has joined!</strong>
            </Segment>
          }
          <Segment style={{ textAlign: 'center' }}><strong>{this.props.playerTwoResources && this.props.playerTwoResources.hasOwnProperty('wood') ?
            (this.props.currentPlayer === this.props.userPlayer ? 'Your turn' : this.props.currentPlayer + ' \'s turn') : `Game will begin when both players have joined.`}</strong>
            {!this.props.spectator && this.props.playerTwoResources && this.props.playerTwoResources.hasOwnProperty('wood') && this.props.currentPlayer === this.props.userPlayer ?
              <div>
                <List horizontal>
                  <List.Item>
                    <List.Content>
                      <UnitShop />
                    </List.Content>
                  </List.Item>
                  <List.Item>
                    <List.Content>
                      <DeployTroops />
                    </List.Content>
                  </List.Item>
                </List>
              </div> : null
            }
          </Segment>
        </Segment.Group>

          { this.props.location.state
            ? (this.props.location.state.otherPlayerInfo
              ? <Transition animation={'pulse'} duration={5000} visible={true}><Modal open={this.state.modalOpen} closeIcon onClose={() => this.setState({
                  modalOpen: false,
                  email: this.props.location.state.otherPlayerInfo.email
                })}>
                  <Modal.Header><Icon name='envelope'/> Email to: {this.props.location.state.otherPlayerInfo.username}</Modal.Header>
                  <Modal.Content>
                    <Modal.Description>
                      <Form size={'large'} key={'small'}>
                        <Form.Group widths='equal'>
                          <Form.TextArea
                            onChange={this.handleChange.bind(this)}
                            label='Message'
                            name={'message'}
                            value={this.state.message}
                            placeholder="Yo, let's finish our awesome game of Hexology!" />
                        </Form.Group>
                      </Form>
                    </Modal.Description>
                  </Modal.Content>
                  <Divider/>
                  <Modal.Actions>

                  <Modal trigger={<Button color={'blue'} onClick={() => this.state.inviteSent ? null : this.sendEmailToResume()}>{this.state.buttonMessage}</Button>}>
                      <Modal.Header>Invite Sent</Modal.Header>
                      <Modal.Content>
                        <Modal.Description>
                          Invite sent to {this.props.location.state.otherPlayerInfo.username}
                        </Modal.Description>
                      </Modal.Content>
                    </Modal>
                    
                  </Modal.Actions>
                </Modal></Transition>
              : <Transition animation={'pulse'} duration={5000} visible={true}><Modal open={this.state.modalOpen} closeIcon onClose={() => this.setState({ modalOpen: false })}>
                <Modal.Header><Icon name='envelope'/> Please write the recipient's email below, along with any message you would like to send.</Modal.Header>
                <Modal.Content>
                  <Modal.Description>
                    <Form size={'large'} key={'small'}>
                      <Form.Group widths='equal'>
                        <Form.Input
                          fluid
                          required
                          name={'email'}
                          value={this.state.email}
                          onChange={this.handleChange.bind(this)}
                          label='Email'
                          placeholder='example@gmail.com' />
                        <Form.TextArea
                          onChange={this.handleChange.bind(this)}
                          label='Message'
                          name={'message'}
                          value={this.state.message}
                          placeholder='Please join me for an awesome game of Hexology!' />
                      </Form.Group>
                    </Form>
                  </Modal.Description>
                </Modal.Content>
                <Divider />
                <Modal.Actions>
                  <Button color={'blue'} onClick={() => this.state.inviteSent ? null : this.sendEmail()}>{this.state.buttonMessage}</Button>
                </Modal.Actions>
              </Modal></Transition>)
            : null
        }
      </Segment>
    )
  }
}


const mapStateToProps = state => {
  return {
    socket: state.state.socket,
    room: state.state.room,
    userPlayer: state.state.userPlayer,
    boardState: state.state.boardState,
    currentPlayer: state.state.currentPlayer,
    playerTwo: state.state.playerTwo,
    menuVisible: state.state.menuVisible,
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources,
    loggedInUser: state.state.loggedInUser,
    spectator: state.state.spectator,
    gameIndex: state.state.gameIndex
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({ exitGame, setRoom, deleteRoom, resetBoard, setHexbot, callTimer }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(TopBar));
