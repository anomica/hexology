import React from 'react';
import { Sidebar, Segment, Button, Menu, Image, Icon, Header, Modal } from 'semantic-ui-react';
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
      newGame: false,
      rules: false
    }

    this.toggleVisibility = this.toggleVisibility.bind(this);
    this.newBoard = this.newBoard.bind(this);
  }

  // toggles sidebar
  toggleVisibility() {
    this.setState({ visible: !this.state.visible });
  }

  newBoard() {
    console.log('props in newbord', this.props)
    this.props.createBoard(5, 4);
  }

  render() {
    const showContent = () => {
      if (this.state.newGame) {
        return (
          <Segment>
            <Header as='h3'>New Game</Header>
            <Segment.Group horizontal>
              <Segment>Player 1 Stuff</Segment>
              <Segment>Other Stuff?</Segment>
              <Segment>Player 2 Stuff</Segment>
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
                    {rules()}
                  </Segment>
                </td>
              </tr>
            </tbody>
          </table>
        )
      }
    }

    const rules = () => {
      if (this.state.rules) {
        // console.log('inside this.state.rules')
        return (
          <Rules toggle={this.state.rules}/>
        )
      }
    }

    const { visible } = this.state;
    return (
      <div>
        <Button onClick={this.toggleVisibility}>Menu</Button>
        <Sidebar.Pushable as={Segment}>
          <Sidebar as={Menu} animation='push' width='thin' visible={visible} icon='labeled' vertical inverted>
            <Menu.Item name='newgame' onClick={() => this.setState({ newGame: true })}
            disabled={this.state.newGame}>
              <Icon name='gamepad' />
              New Game
            </Menu.Item>
            <Menu.Item
              name='rules'
              onClick={() => this.setState({ rules: true })}
            >
              <Icon name='book' />
              Rules
            </Menu.Item>
            <Menu.Item name='login' onClick={() => console.log('login clicked')}>
              <Icon name='user' />
              Login
            </Menu.Item>
          </Sidebar>

          <Sidebar.Pusher>
            {showContent()}
            {rules()}
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