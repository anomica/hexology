import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { setRooms, menuToggle, setSocket, login } from '../../src/actions/actions.js';
import { Button } from 'semantic-ui-react';
import socketIOClient from "socket.io-client";

import axios from 'axios';
const uuidv4 = require('uuid/v4');

import SidebarLeft from './Sidebar.jsx';
import RoomsList from './RoomsList.jsx';

class Main extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    // axios.post('/signup', {
    //   username: 'amy11',
    //   email: 'glova11@aol.com',
    //   password: 'kitty'
    // })
    //   .then(data => {
    //     console.log('data from signup:', data);
    //   })
    //   .catch(err => {
    //     console.log('error from signup:', err);
    //   })
    (async () => {
      let socket = await socketIOClient('http://0.0.0.0:3000');
      this.props.setSocket(socket);
    })();

    // axios.get('/persistUser')
    //   .then(data => {
    //     console.log('data from session:', data);
    //     if (data.data) {

    //     }
    //   })
    //   .catch(err => {
    //     console.log('err from persistUser:', err);
    //   })

    axios.get('/rooms')
      .then(rooms => {
        for (let room in rooms.data) {
          if (room[0] !== '*') {
            delete rooms.data[room]
          }
        }
        this.props.setRooms(rooms.data);
      })
      .catch(err => {
        console.error('error retrieving rooms: ', err);
      })
  }

  render() {
    return (
      <div>
        <SidebarLeft />
        <RoomsList />
        <Button style={{float: 'left', position: 'absolute', bottom: '50px', left: '35px'}} onClick={this.props.menuToggle}>Menu</Button>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    // playerOne: state.state.playerOne
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ setRooms, menuToggle, setSocket, login }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(Main);
