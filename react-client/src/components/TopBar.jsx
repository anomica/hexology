import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { Segment, Actions, Input, TextArea, Button, Header, Popup, Image, Modal, Content, Description, Icon, Form, Checkbox, Divider, Label } from 'semantic-ui-react';
import { exitGame } from '../../src/actions/actions.js';

import UnitShop from './UnitShop.jsx';

class TopBar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modalOpen: false,
      email: '',
      message: '',
      inviteSent: false
    }
  }

  exitGame() {
    this.props.exitGame();
    this.props.socket.close();
    this.props.history.push('/');
  }

  sendEmail() {
    this.setState({ inviteSent: true })
    this.props.socket.emit('sendEmail', {
      username: 'test', // change this to reflect logged in user
      email: this.state.email,
      message: this.state.message,
      room: this.props.room
    })
  }

  handleChange(e, {name, value}) {
    this.setState({ [name] : value })
  }

  render() {
    return (
      <Segment className={'topBar'} secondary floated={'right'} raised>
        <Header as='h1'>Hexology</Header>
        <Button style={{right: '10px', top: '20px', position: 'absolute'}} onClick={exitGame}>Exit Game</Button>
        <Header as='h4' style={{marginTop: '-10px'}}>You are {this.props.userPlayer === 'player1' ? 'player one' : 'player two'}!</Header>
        {this.props.boardState ? null : <Segment>Want to play with a friend? <Button onClick={() => this.setState({ modalOpen: true })}>Click Here</Button></Segment>}
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
            (this.props.currentPlayer === 'player1' ? 'Player one\'s turn' : 'Player two\'s turn') :
            `Game will begin when both players have joined.`}</strong>
          {this.props.playerTwoResources && this.props.playerTwoResources.hasOwnProperty('wood') && this.props.currentPlayer === this.props.userPlayer ?
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
              <strong>Waiting for player two to join...</strong>
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
            <Button onClick={() => this.state.inviteSent ? null : this.sendEmail()}>Invite</Button>
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
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({ exitGame }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(TopBar));
