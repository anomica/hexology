import React from 'react';
import { Form, Select, Divider, Sidebar, Segment, Button, Menu, Image, Icon, Header, Modal, Transition, Statistic } from 'semantic-ui-react';
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
      userRank: null,
      disabled: window.location.href.indexOf('game') === -1 ? false : true,
      hexbot: 'no',
      spectators: 'yes'
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
        userLosses: data.user.losses,
        userRank: data.user.rank
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
        if (this.state.hexbot === 'yes') {
          this.props.setHexbot(true);
          this.props.socket.emit('botGame', {
            username: this.props.setLoggedInUser || 'anonymous',
            type: 'private',
            spectators: this.state.spectators
          })
        } else {
          this.props.socket.emit('newGame', {
            gameType: this.state.gameType,
            username: this.props.loggedInUser,
            socketId: this.props.socket.id,
            spectators: this.state.spectators
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
    axios.post('/logout', {
      gameIndex: this.props.gameIndex,
      room: this.props.room
    })
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
        <Transition animation={'pulse'} duration={5000} visible={true}>
          <LoadGame
            open={this.state.loadGameModal}
            close={this.toggleLoadGames}
            username={this.props.loggedInUser}
          />
        </Transition>
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
                      <Modal.Description style={{fontSize: '14pt', textAlign: 'center', margin: 'auto'}}>
                        <Statistic.Group widths='three' style={{marginRight: '15%', marginLeft: '15%'}}>
                          <Statistic>
                            <Statistic.Value>{this.state.userWins}</Statistic.Value>
                            <Statistic.Label><Icon name='winner' />Wins</Statistic.Label>
                          </Statistic>
                          <Statistic>
                            <Statistic.Value># {this.state.userRank}</Statistic.Value>
                            <Statistic.Label><Icon name='gamepad' />Rank</Statistic.Label>
                          </Statistic>
                          <Statistic>
                            <Statistic.Value>{this.state.userLosses}</Statistic.Value>
                            <Statistic.Label><Icon name='tint' />Losses</Statistic.Label>
                          </Statistic>
                        </Statistic.Group>
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

          <Transition animation={'pulse'} duration={5000} visible={true}>
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
                      defaultValue={'public'}
                      options={[{key: 'public', text: 'Public', value: 'public'}, {key: 'private', text: 'Private (not joinable except by invite)', value: 'private'}]}
                      name={'gameType'}
                      onChange={this.handleChange.bind(this)}
                      label='Game Type'
                     />
                    <Form.Select
                      required
                      label
                      defaultValue={'yes'}
                      options={[{key: 'yes', text: 'Yes', value: 'yes'}, {key: 'no', text: 'No', value: 'no'}]}
                      name={'spectators'}
                      onChange={this.handleChange.bind(this)}
                      label='Allow Spectators'
                     />
                    <Form.Select
                      required
                      label
                      defaultValue={'no'}
                      options={[{ key: 'no', text: 'No', value: 'no' }, { key: 'yes', text: 'Yes', value: 'yes' }]}
                      name={'timer'}
                      onChange={this.handleChange.bind(this)}
                      label='Play With Timer?'
                    />
                    <Form.Select
                      required
                      label
                      defaultValue={'no'}
                      options={[{key: 'no', text: 'No', value: 'no'}, {key: 'yes', text: 'Yes', value: 'yes'}]}
                      name={'hexbot'}
                      onChange={this.handleChange.bind(this)}
                      label='Play Against Hexbot?'
                     />
                   <Image src='./images/hexbot.jpg'/>
                </Form>
              </Modal.Description>
            </Modal.Content>
            <Divider/>
            <Modal.Actions>
              <Button color={'green'} onClick={this.newGame.bind(this)}>Start Game</Button>
            </Modal.Actions>
          </Modal>
          </Transition>
          <Transition animation={'pulse'} duration={5000} visible={true}>
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
          </Transition>

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
    spectator: state.state.spectator,
    gameIndex: state.state.gameIndex,
    room: state.state.room
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ exitGame, setRoom, toggleLoginSignup, login, setHexbot, callTimer }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(SidebarLeft));
