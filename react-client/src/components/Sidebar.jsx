import React from 'react';
import { Sidebar, Segment, Button, Menu, Image, Icon, Header, Modal } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import Board from './Board.jsx';
import Rules from './Rules.jsx';
import Login from './Login.jsx';
import UnitShop from './UnitShop.jsx';
import DefaultState from '../store/DefaultState';
import { Link } from 'react-router-dom';
import { exitGame, setRoom } from '../../src/actions/actions.js';

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

  newGame() {
    this.props.socket.emit('newGame');
    this.props.socket.on('newGame', data => {
      this.props.setRoom(data.room);
      this.props.history.push({
        pathname: `/game/room?${data.room}`,
        state: {
          extra: 'create',
        }
      })
    })
  }

  render() {
    // Shows rules modal if rules menu item is clicked
    const showRules = () => {
      if (this.state.rules) {
        return (
          <Rules open={this.state.rules} close={this.toggleRules} />
        )
      }
    }

    const { menuVisible } = this.props;

    let styles = {
      sidebar: {
        position: 'fixed',
        height: '100%',
        minWidth: this.props.menuVisible ? '160px' : 0
      }
    }

    return (
      <div style={styles.sidebar}>
          <Sidebar style={{top: 0}} as={Menu} animation='scale down' width='thin' visible={menuVisible} icon='labeled' vertical inverted>

            <Menu.Item
              name='game'
              onClick={this.newGame.bind(this)}
            >
              <Icon name='gamepad' />
              Start New Game
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

            <Menu.Item>
              <strong>Hex Legend</strong>
              <p></p>
              <p>Units on Hex:</p>
              <ul style={{marginLeft: '-40px', listStyleType: 'none'}}>
                <li><strong>S, A, K</strong></li>
                <li>Swordsmen</li>
                <li>Archers</li>
                <li>Knights</li>
              </ul>
              <p>Resources:</p>
              <ul style={{marginLeft: '-40px', listStyleType: 'none'}}>
                <li style={{color: 'gold'}}>Gold</li>
                <li style={{color: 'green'}}>Wood</li>
                <li style={{color: 'grey'}}>Metal</li>
              </ul>
            </Menu.Item>
          </Sidebar>


            {showRules()}

      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    socket: state.state.socket,
    menuVisible: state.state.menuVisible,
    currentPlayer: state.state.currentPlayer,
    userPlayer: state.state.userPlayer,
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ exitGame, setRoom }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(SidebarLeft));
