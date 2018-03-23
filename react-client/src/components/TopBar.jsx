import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { Segment, Button, Header, Popup, Image, Modal, Content, Description, Icon, Form, Checkbox, Divider, Label } from 'semantic-ui-react';
import { exitGame, toggleUnitShop } from '../../src/actions/actions.js';

import UnitShop from './UnitShop.jsx';


const TopBar = props => {

  const exitGame = () => {
    props.exitGame();
    props.socket.close();
    props.history.push('/');
  }

  let toggle = false;

  const toggleUnitShop = () => {
    toggle = !toggle;
    props.toggleUnitShop(toggle);
    console.log('toggle:', toggle);
  }

  return (
    <Segment className={'topBar'} secondary floated={'right'} raised>
      <Header as='h1'>Hexology</Header>
      <Button style={{right: '10px', top: '20px', position: 'absolute'}} onClick={exitGame}>Exit Game</Button>
      <Header as='h4' style={{marginTop: '-10px'}}>You are {props.userPlayer === 'player1' ? 'player one' : 'player two'}!</Header>
      {props.boardState ? null : <Segment>Want to play with a friend? Send them this link: TO BE ADDED</Segment>}
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
          (props.currentPlayer === 'player1' ? 'Player one\'s turn' : 'Player two\'s turn') :
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
    boardState: state.state.boardState,
    currentPlayer: state.state.currentPlayer,
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({ exitGame, toggleUnitShop }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(TopBar));
