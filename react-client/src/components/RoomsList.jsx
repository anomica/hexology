import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Segment, Image, Feed, Label, Button } from 'semantic-ui-react';
import socketIOClient from "socket.io-client";
import { withRouter } from 'react-router';
import { newRoom } from '../../src/actions/actions.js';

const RoomsList = props => {

  const joinGame = (room) => {
    props.history.push({
      pathname: '/game',
      state: {
        detail: room
      }
    })
  }

  const refreshRooms = async () => {
    let socket = await props.socket;
    if (socket) {
      socket.on('newRoom', (room) => {
        props.newRoom(room);
      })
    }
  }

  refreshRooms();

  if (props.rooms) {
    return (
      <Feed style={{textAlign: 'center', width: '45%', marginLeft: '20%', marginTop: 0, paddingTop: '20px'}}>
        <h1>Welcome to Hexology</h1>
        <h3>Currently Open Rooms: </h3>
        {Object.keys(props.rooms).map((roomName, id) => {
          let room = props.rooms[roomName];
          return (
            <Feed key={id}>
              <Feed.Content>
                <Feed.Label>New Game</Feed.Label>
                <Feed.Meta>Players: {room.length}/2</Feed.Meta>
              </Feed.Content>
              {room.length === 1 ?
                <Button onClick={() => joinGame(roomName)} color="green">Join Game</Button> :
                <Button color="red" disabled>Game Full</Button>
              }
            </Feed>
          )
        })}
      </Feed>
    )
  } else {
    return <Segment>No available games. Start your own!</Segment>;
  }
}


const mapStateToProps = state => {
  return {
    rooms: state.state.rooms,
    socket: state.state.socket
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({ newRoom }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(RoomsList));
