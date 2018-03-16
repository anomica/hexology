import React from 'react';
import { Sidebar, Segment, Button, Menu, Image, Icon, Header } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import Board from './Board.jsx';

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
          <Board />
        )
      } else {
        return (
          <table height={800}>homepage</table>
        )
      }
    }

    const { visible } = this.state;
    return (
      <div>
        <Button onClick={this.toggleVisibility}>Menu</Button>
        <Sidebar.Pushable as={Segment}>
          <Sidebar as={Menu} animation='push' width='thin' visible={visible} icon='labeled' vertical inverted>
            <Menu.Item name='home' onClick={() => console.log('home clicked')}>
              <Icon name='home' />
              Home
            </Menu.Item>
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
            <Segment>
              <Header as='h3'>Application Content</Header>
              {newGame()}
            </Segment>
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