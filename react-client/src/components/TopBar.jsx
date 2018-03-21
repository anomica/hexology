import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { Segment, Button, Header, Popup, Image, Modal, Content, Description, Icon, Form, Checkbox, Divider, Label } from 'semantic-ui-react';
import { exitGame } from '../../src/actions/actions.js';

import UnitShop from './UnitShop.jsx';


const TopBar = props => {

  const exitGame = () => {
    props.exitGame();
    props.socket.close();
    props.history.push('/');
  }

  return (
    <Segment style={{width: '80%', float: 'right'}}>
      <Header as='h3'>Hexology: you are {props.userPlayer === 'player1' ? 'player one' : 'player two'}!</Header>
      <Button onClick={exitGame}>Exit Game</Button>
      <Segment.Group horizontal>
        {props.playerOneResources && props.playerOneResources.hasOwnProperty('wood') ?
          <Segment>
            <strong>Player One Resources</strong>
            <ul>
              <li>Gold: {props.playerOneResources.gold}</li>
              <li>Wood: {props.playerOneResources.wood}</li>
              <li>Metal: {props.playerOneResources.metal}</li>
            </ul>
          </Segment> :
          <Segment>
            <strong>Player One has joined!</strong>
          </Segment>
        }
        <Segment style={{textAlign: 'center'}}><strong>{props.playerTwoResources && props.playerTwoResources.hasOwnProperty('wood') ?
          `${props.currentPlayer}'s turn` :
          `Game will begin when both players have joined.`}</strong>
        {props.playerTwoResources && props.playerTwoResources.hasOwnProperty('wood') && props.currentPlayer === props.userPlayer ?
          <UnitShop>Shop</UnitShop> : null
          }
        </Segment>
        {props.playerTwoResources && props.playerTwoResources.hasOwnProperty('wood') ?
          <Segment>
            <strong>Player Two Resources</strong>
            <ul>
              <li>Gold: {props.playerTwoResources.gold}</li>
              <li>Wood: {props.playerTwoResources.wood}</li>
              <li>Metal: {props.playerTwoResources.metal}</li>
            </ul>
          </Segment> :
          <Segment>
            <strong>Waiting for player two to join...</strong>
          </Segment>
        }
      </Segment.Group>
    </Segment>
  )
}

const mapStateToProps = state => {
  return {
    socket: state.state.socket,
    userPlayer: state.state.userPlayer,
    currentPlayer: state.state.currentPlayer,
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({ exitGame }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(TopBar));
