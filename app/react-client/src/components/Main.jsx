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
    console.log('in the main component constructor');
  }

  componentDidMount() {
    (async () => {
      let endpoint = '/';
      console.log('endpoint:', endpoint);
      let socket = await socketIOClient(endpoint);
      console.log('socket:', socket);

      // let socket = await socketIOClient('http://127.0.0.1:8080');
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
          if (room[0] !== '*' || rooms.data[room].player2 === 'hexbot') {
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
