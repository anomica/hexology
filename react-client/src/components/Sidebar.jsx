import React from 'react';
import { Sidebar, Segment, Button, Menu, Image, Icon, Header } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import Board from './Board.jsx';
import Rules from './Rules.jsx';
import Login from './Login.jsx';
import DefaultState from '../store/DefaultState';

class SidebarLeft extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: true,
      newGame: false
    }

    this.toggleVisibility = this.toggleVisibility.bind(this);
  }

  toggleVisibility() {
    this.setState({ visible: !this.state.visible });
  }

  render() {
    const newGame = () => {
      if (this.state.newGame) {
        return (
          <Segment>
            <Header as='h3'>New Game</Header>
            <Board />
          </Segment>
        )
      } else {
        return (
          <table height={800}>
            <tbody>
              <tr>
                <td style={{verticalAlign: 'top'}}>
                  <Header as='h3'>Welcome</Header>
                </td>
              </tr>
            </tbody>
          </table>
        )
      }
    }

    const showRules = () => {
      return (
        <Rules />
      )
    }

    const { visible } = this.state;
    return (
      <div>
        <Button onClick={this.toggleVisibility}>Menu</Button>
        <Sidebar.Pushable as={Segment}>
          <Sidebar as={Menu} animation='push' width='thin' visible={visible} icon='labeled' vertical inverted>
            <Menu.Item name='newgame' onClick={() => this.setState({ newGame: true })} disabled={this.state.newGame}>
              <Icon name='gamepad' />
              New Game
            </Menu.Item>
            <Menu.Item name='rules' onClick={() => console.log('rules clicked')}>
              <Icon name='book' />
              Rules
            </Menu.Item>
            <Menu.Item name='login' onClick={() => console.log('login clicked')}>
              <Icon name='user' />
              Login
            </Menu.Item>
          </Sidebar>

          <Sidebar.Pusher>
            {newGame()}
            {showRules()}
          </Sidebar.Pusher>

        </Sidebar.Pushable>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {

  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(SidebarLeft));