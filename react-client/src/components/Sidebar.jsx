import React from 'react';
import { Form, Select, Divider, Sidebar, Segment, Button, Menu, Image, Icon, Header, Modal, Transition } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import Board from './Board.jsx';
import Rules from './Rules.jsx';
import LoadGame from './LoadGame.jsx';
import Login from './Login.jsx';
import Signup from './Signup.jsx';
import UnitShop from './UnitShop.jsx';
import DefaultState from '../store/DefaultState';
import { Link } from 'react-router-dom';
import { toggleLoginSignup, exitGame, setRoom, login, setHexbot, callTimer } from '../../src/actions/actions.js';
import axios from 'axios';

class SidebarLeft extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: true,
      newGame: false,
      newGameModalOpen: false,
      saveGameButton: false,
      gameType: 'public',
      rules: false,
      profile: false,
      logoutModal: false,
      loadGameModal: false,
      userWins: null,
      userLosses: null,
      disabled: window.location.href.indexOf('game') === -1 ? false : true,
      hexbot: false
    }

    this.toggleMenu = this.toggleMenu.bind(this);
    this.toggleRules = this.toggleRules.bind(this);
    this.showLoadGames = this.showLoadGames.bind(this);
    this.toggleLoadGames = this.toggleLoadGames.bind(this);
    this.getUserStuff = this.getUserStuff.bind(this);
  }

  getUserStuff() {
    let socket = this.props.socket;
    socket.emit('getUserStuff', {
      username: this.props.loggedInUser,
    });

    socket.on('getUserStuff', data => {
      // console.log('data yo: ',data)
      this.setState({
        userWins: data.user.wins,
        userLosses: data.user.losses
      });
    })
  }

  toggleMenu() { // toggles sidebar
    this.setState({ visible: !this.state.visible });
  }

  toggleRules() {
    this.setState({ rules: !this.state.rules });
  }

  toggleLoadGames() {
    this.setState({ loadGameModal: !this.state.loadGameModal });
  }

  newGame() {
    (async () => {
      let username = await this.props.loggedInUser;
      if (username) {
        if (this.state.hexbot) {
          this.props.setHexbot(true);
          this.props.socket.emit('botGame', {
            username: this.props.setLoggedInUser || 'anonymous',
            type: 'private'
          })
        } else {
          this.props.socket.emit('newGame', {
            gameType: this.state.gameType,
            username: this.props.loggedInUser,
            socketId: this.props.socket.id
          });
        }
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
        this.props.history.push('/');
        setTimeout(() => this.setState({ logoutModal: false }), 2000);
      })
      .catch(err => {
        console.error(err);
      });
  }

  handleChange(e, { name, value }) {
    name === 'timer' ? this.props.callTimer(true) : this.setState({ [name]: value });
  }

  showLoadGames() {
    if (this.state.loadGameModal) {
      return (
        <LoadGame
          open={this.state.loadGameModal}
          close={this.toggleLoadGames}
          username={this.props.loggedInUser}
        />
      )
    }
  }

  render() {
    const showRules = () => { // Shows rules modal if rules menu item is clicked
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

            {this.props.loggedInUser === 'anonymous' || this.props.spectator ?
              null :
              <Menu.Item
                name='load'
                onClick={() => {
                  this.setState({ loadGameModal: !this.state.loadGameModal });
                }}
                disabled={this.state.disabled}
              >
                <Icon name='gamepad' />
                Load Game
              </Menu.Item>
            }

            <Menu.Item
              name='rules'
              onClick={() => this.setState({ rules: !this.state.rules })}
            >
              <Icon name='book' />
              Rules
            </Menu.Item>

            {this.props.loggedInUser === 'anonymous' || this.props.spectator ?
              <Menu.Item
                name='signup'
                onClick={() => {this.showLoginOrSignupModal('signup')}}
                >
                <Signup />
                <Icon name='user plus' />
                Sign Up
              </Menu.Item> :
              <Menu.Item name='welcome' style={{cursor: 'pointer'}} onClick={() => {
                this.getUserStuff();
                this.setState({ profile: !this.state.profile })}}>
                <Icon name='hand victory'/>
                Welcome, {this.props.loggedInUser}!
                <Transition animation={'pulse'} duration={5000} visible={true}>
                  <Modal open={this.state.profile} onClose={ () => this.setState({ profile: !this.state.profile })}>
                    <Modal.Header><Icon name='user' /> {this.props.loggedInUser}</Modal.Header>
                    <Modal.Content>
                      <Modal.Description style={{fontSize: '14pt'}}>
                        <strong>Wins:</strong> {this.state.userWins}
                        <br/>
                        <strong>Losses:</strong> {this.state.userLosses}
                        <p/>
                      </Modal.Description>
                    </Modal.Content>
                  </Modal>
                </Transition>
              </Menu.Item>
            }

            {this.props.loggedInUser === 'anonymous' || this.props.spectator ?
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
                      options={[{ key: 'yes', text: 'Yes', value: 'yes' }, { key: 'no', text: 'No', value: 'no' }]}
                      name={'timer'}
                      onChange={this.handleChange.bind(this)}
                      label='Play With Timer?'
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
            {this.showLoadGames()}
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
    loggedInUser: state.state.loggedInUser,
    spectator: state.state.spectator
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ exitGame, setRoom, toggleLoginSignup, login, setHexbot, callTimer }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(SidebarLeft));
