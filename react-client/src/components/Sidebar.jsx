import React from 'react';
import { Sidebar, Segment, Button, Menu, Image, Icon, Header, Modal } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import Board from './Board.jsx';
import Rules from './Rules.jsx';
import Login from './Login.jsx';
import DefaultState from '../store/DefaultState';
import { Link } from 'react-router-dom';

class SidebarLeft extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: true,
      newGame: false,
      rules: false
    }

    this.toggleMenu = this.toggleMenu.bind(this);
    this.toggleRules = this.toggleRules.bind(this);
  }

  // toggles sidebar
  toggleMenu() {
    this.setState({ visible: !this.state.visible });
  }

  toggleRules() {
    this.setState({ rules: !this.state.rules });
  }

  render() {
    const showContent = () => {
      if (this.state.newGame) {
        return (
          <Segment>
            <Header as='h3'>New Game</Header>
            <Segment.Group horizontal>
                {this.props.playerOneResources.hasOwnProperty('wood') ?
                  <Segment>
                    <strong>Player One Resources</strong>
                    <li>
                      <ul>Gold: {this.props.playerOneResources.gold}</ul>
                      <ul>Wood: {this.props.playerOneResources.wood}</ul>
                      <ul>Metal: {this.props.playerOneResources.metal}</ul>
                    </li>
                </Segment> :
                <Segment>
                  <strong>Player One has joined!</strong>
                </Segment>
                }
              <Segment style={{textAlign: 'center'}}><strong>{this.props.playerTwoResources.hasOwnProperty('wood') ?
                  `${this.props.currentPlayer}'s turn` :
                  `Game will begin when both players have joined.`}</strong></Segment>
                {this.props.playerTwoResources.hasOwnProperty('wood') ?
                <Segment>
                  <strong>Player Two Resources</strong>
                  <li>
                    <ul>Gold: {this.props.playerTwoResources.gold}</ul>
                    <ul>Wood: {this.props.playerTwoResources.wood}</ul>
                    <ul>Metal: {this.props.playerTwoResources.metal}</ul>
                  </li>
              </Segment> :
              <Segment>
                <strong>Waiting for player two to join...</strong>
              </Segment>
              }
            </Segment.Group>
            <Board />
          </Segment>
        )
      } else {
        return (
          <table height={800}>
            <tbody>
              <tr>
                <td style={{verticalAlign: 'top'}}>
                  <Segment>
                    <Header as='h3'>Welcome</Header>
                  </Segment>
                </td>
              </tr>
            </tbody>
          </table>
        )
      }
    }

    // Shows rules modal if rules menu item is clicked
    const showRules = () => {
      if (this.state.rules) {
        return (
          <Rules open={this.state.rules} close={this.toggleRules} />
        )
      }
    }

    const { visible } = this.state;

    return (
      <div>
        <Button onClick={this.toggleMenu}>Menu</Button>
        <Sidebar.Pushable as={Segment}>
          <Sidebar as={Menu} animation='push' width='thin' visible={visible} icon='labeled' vertical inverted>

            <Menu.Item name='newgame' onClick={() => this.setState({ newGame: true })}
            disabled={this.state.newGame}>
              <Icon name='gamepad' />
              New Game
            </Menu.Item>

            <Menu.Item
              name='rules'
              onClick={() => this.setState({ rules: !this.state.rules })}
            >
              <Icon name='book' />
              Rules
            </Menu.Item>

            <Menu.Item
              as={Link} to='/login'
              name='login'
            >
              <Icon name='user' />
              Login
            </Menu.Item>

            <Menu.Item
              as={Link} to='/signup'
              name='signup'
            >
              <Icon name='user' />
              Signup
            </Menu.Item>
          </Sidebar>

          <Sidebar.Pusher>
            {showContent()}
            {showRules()}
          </Sidebar.Pusher>

        </Sidebar.Pushable>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    currentPlayer: state.state.currentPlayer,
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(SidebarLeft));
