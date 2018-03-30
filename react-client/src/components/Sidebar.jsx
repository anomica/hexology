import React from 'react';
import { Form, Select, Divider, Sidebar, Segment, Button, Menu, Image, Icon, Header, Modal } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import Board from './Board.jsx';
import Rules from './Rules.jsx';
import Login from './Login.jsx';
import Signup from './Signup.jsx';
import UnitShop from './UnitShop.jsx';
import DefaultState from '../store/DefaultState';
import { Link } from 'react-router-dom';
import { toggleLoginSignup, exitGame, setRoom, login, setHexbot } from '../../src/actions/actions.js';
import axios from 'axios';

class SidebarLeft extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: true,
      newGame: false,
      newGameModalOpen: false,
      gameType: 'public',
      rules: false,
      logoutModal: false,
      disabled: window.location.href.indexOf('game') === -1 ? false : true,
      hexbot: false
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
    (async () => {
      let username = await this.props.loggedInUser;
      if (username) {
        this.state.hexbot && this.props.setHexbot(true);
        this.props.socket.emit('newGame', { 
          gameType: this.state.gameType,
          username: this.props.loggedInUser
         });
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
    })();
  }

  showLoginOrSignupModal(type) {
    this.props.toggleLoginSignup(type);
    // setTimeout(() => {console.log('this.state.showLogin', this.state.showLogin)})
  }

  logout() {
    axios.post('/logout')
      .then(data => {
        this.props.login('anonymous');
        this.setState({ logoutModal: true });
        setTimeout(() => this.setState({ logoutModal: false }), 2000);
      })
      .catch(err => {
        console.error(err);
      });
  }

  handleChange(e, { name, value }) {
    this.setState({ [name]: value });
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
        minWidth: this.props.menuVisible ? '160px' : 0,
        zIndex: 1000
      }
    }

    return (
      <div style={styles.sidebar}>
          <Sidebar style={{top: 0}} as={Menu} animation='scale down' width='thin' visible={menuVisible} icon='labeled' vertical inverted>

            <Menu.Item
              name='game'
              onClick={() => this.setState({ newGameModalOpen: !this.state.newGameModalOpen })}
              disabled={this.state.disabled}
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

            {this.props.loggedInUser === 'anonymous' ?
              <Menu.Item
                name='signup'
                onClick={() => {this.showLoginOrSignupModal('signup')}}
                >
                <Signup />
                <Icon name='user' />
                Signup
              </Menu.Item> :
              <Menu.Item
                name='welcome'
              >
              <Icon name='hand victory'/>
              Welcome, {this.props.loggedInUser}!
              </Menu.Item>
            }

            {this.props.loggedInUser === 'anonymous' ?
              <Menu.Item
                name='login'
                onClick={() => {this.showLoginOrSignupModal('login')}}
                >
                <Login />
                <Icon name='user' />
                Login
              </Menu.Item> :
              <Menu.Item
                name='logout'
                onClick={() => this.logout()}
              >
              <Icon name='remove user' />
                Logout
              </Menu.Item>
            }

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

          <Modal
            open={this.state.newGameModalOpen}
            size={'tiny'}
            closeIcon
            onClose={() => this.setState({ newGameModalOpen: false })}>
            <Modal.Header>New Game</Modal.Header>
            <Modal.Content>
              <Modal.Description>
                <Form size={'tiny'} key={'small'}>
                  <Form.Group widths='equal'>
                    <Form.Select
                      required
                      label
                      placeholder={'Public'}
                      options={[{key: 'private', text: 'Private', value: 'private'}, {key: 'public', text: 'Public', value: 'public'}]}
                      name={'gameType'}
                      onChange={this.handleChange.bind(this)}
                      label='Game Type'
                     />
                    <Form.Select
                      required
                      label
                      placeholder={'No'}
                      options={[{key: 'yes', text: 'Yes', value: 'yes'}, {key: 'no', text: 'No', value: 'no'}]}
                      name={'hexbot'}
                      onChange={this.handleChange.bind(this)}
                      label='Play Against Hexbot?'
                     />
                   <Image src='https://lh3.googleusercontent.com/-Eorum9V_AXA/AAAAAAAAAAI/AAAAAAAAAAc/1qvQou0NgpY/s90-c-k-no/photo.jpg'/>
                  </Form.Group>
                </Form>
              </Modal.Description>
            </Modal.Content>
            <Divider/>
            <Modal.Actions>
              <Button color={'green'} onClick={this.newGame.bind(this)}>Start Game</Button>
            </Modal.Actions>
          </Modal>
          <Modal
            open={this.state.logoutModal}
            size={'tiny'}
            style={{textAlign: 'center'}}
          >
            <Modal.Header>Logout Successful!</Modal.Header>
            <Modal.Content>
              <Modal.Description>
                See you again soon!
              </Modal.Description>
            </Modal.Content>
          </Modal>

            {showRules()}

      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    socket: state.state.socket,
    boardState: state.state.boardState,
    menuVisible: state.state.menuVisible,
    currentPlayer: state.state.currentPlayer,
    userPlayer: state.state.userPlayer,
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources,
    showLogin: state.state.showLogin,
    loggedInUser: state.state.loggedInUser
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ exitGame, setRoom, toggleLoginSignup, login, setHexbot }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(SidebarLeft));
