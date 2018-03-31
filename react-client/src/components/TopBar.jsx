import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { Segment, Actions, Input, TextArea, Button, Header, Popup, Image, Modal, Content, Description, Icon, Form, Checkbox, Divider, Label } from 'semantic-ui-react';
import { exitGame, setRoom, deleteRoom, resetBoard } from '../../src/actions/actions.js';
import UnitShop from './UnitShop.jsx';

class TopBar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modalOpen: false,
      email: '',
      message: '',
      inviteSent: false,
      buttonMessage: 'Invite'
    }

    this.saveGame = this.saveGame.bind(this);
  }

  saveGame() {
    // console.log('inside save game')
    // console.log('this props', this.props)
  }

  exitGame() {
    this.props.exitGame();
    this.props.setRoom(null);
    this.props.resetBoard();
    this.props.deleteRoom(this.props.room);
    this.props.socket.emit('disconnect', { gameIndex: this.props.gameIndex });
    this.props.socket.emit('leaveRoom', {
      room: this.props.room,
      gameIndex: this.props.gameIndex
    });
    this.props.history.push('/');
  }


  sendEmail() {
    this.setState({ inviteSent: true, buttonMessage: 'Invite sent!' })
    this.props.socket.emit('sendEmail', {
      username: this.props.loggedInUser,
      email: this.state.email,
      message: this.state.message,
      room: this.props.room
    })
    setTimeout(() => this.setState({ modalOpen: false }), 2000);
  }

  handleChange(e, {name, value}) {
    this.setState({ [name] : value })
  }

  render() {
    return (
      <Segment className={'topBar'} style={{display: 'block', width:this.props.menuVisible ? '80%' : '97%' }} secondary floated={'right'} raised>
        <Header as='h1'>Hexology</Header>

        <div style={{right: '10px', top: '20px', position: 'absolute'}}>
          {this.props.loggedInUser !== 'anonymous' && this.props.playerTwo !== 'anonymous' && !this.props.spectator && this.props.playerOneResources && this.props.playerOneResources.hasOwnProperty('wood') ?
            <Button
              style={{marginRight: '5px'}}
              onClick={this.saveGame}
            >Save Game</Button> : null
          }

          <Button
            onClick={this.exitGame.bind(this)}
          >Exit Game</Button>
        </div>
        <Header as='h4' style={{marginTop: '-10px'}}>You are {this.props.userPlayer === 'player1' ? 'player one' : this.props.spectator ? 'spectating this game' : 'player two'}!</Header>
        {this.props.boardState ? null :
          (this.state.inviteSent ? <Segment>Invite sent to {this.state.email}</Segment> :
            <Segment>Want to play with a friend?
              <Button
                size={'tiny'}
                color={'blue'}
                compact
                style={{marginLeft: '20px'}}
                onClick={() => this.setState({ modalOpen: true })}
                >
                Click Here
              </Button>
            </Segment>
          )
        }
        <Segment.Group horizontal>
          {this.props.playerOneResources && this.props.playerOneResources.hasOwnProperty('wood') ?
            <Segment>
              <strong>Player One Resources</strong>
              <ul>
                <li>Gold: {this.props.playerOneResources.gold}</li>
                <li>Wood: {this.props.playerOneResources.wood}</li>
                <li>Metal: {this.props.playerOneResources.metal}</li>
              </ul>
            </Segment> :
            <Segment>
              <strong>Player One has joined!</strong>
            </Segment>
          }
          <Segment style={{textAlign: 'center'}}><strong>{this.props.playerTwoResources && this.props.playerTwoResources.hasOwnProperty('wood') ?
            (this.props.currentPlayer === 'player1' ? 'Player one\'s turn' : 'Player two\'s turn') : `Game will begin when both players have joined.`}</strong>
          {!this.props.spectator && this.props.playerTwoResources && this.props.playerTwoResources.hasOwnProperty('wood') && this.props.currentPlayer === this.props.userPlayer ?
            <UnitShop>Shop</UnitShop> : null
            }
          </Segment>
          {this.props.playerTwoResources && this.props.playerTwoResources.hasOwnProperty('wood') ?
            <Segment>
              <strong>Player Two Resources</strong>
              <ul>
                <li>Gold: {this.props.playerTwoResources.gold}</li>
                <li>Wood: {this.props.playerTwoResources.wood}</li>
                <li>Metal: {this.props.playerTwoResources.metal}</li>
              </ul>
            </Segment> :
            <Segment>
              <div>
                <Icon loading name='spinner'/>
                <strong>Waiting for player two to join...</strong>
              </div>
            </Segment>
          }
        </Segment.Group>
        <Modal open={this.state.modalOpen} closeIcon onClose={() => this.setState({ modalOpen: false })}>
          <Modal.Header>Please write the recipient's emails below, along with any message you would like to send.</Modal.Header>
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
          <Divider/>
          <Modal.Actions>
            <Button color={'blue'} onClick={() => this.state.inviteSent ? null : this.sendEmail()}>{this.state.buttonMessage}</Button>
          </Modal.Actions>
        </Modal>
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
  return bindActionCreators({ exitGame, setRoom, deleteRoom, resetBoard }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(TopBar));
