import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Segment, Image, Feed, Label, Button } from 'semantic-ui-react';
import socketIOClient from "socket.io-client";
import { withRouter } from 'react-router';
import { login, updateRoom, newRoom, deleteRoom } from '../../src/actions/actions.js';

const RoomsList = props => {
  
  const joinGame = async (room, type, index) => {
    type ? props.login('spectator') : null;
    props.history.push({
    pathname: `/game/room?${room}`,
    state: {
      detail: room,
      extra: 'join',
      type: type ? type : null,
      gameIndex: index ? index : null
    }
    })
  }

    

  const refreshRooms = async () => {
    let socket = await props.socket;
    if (socket) {
      socket.on('newRoom', (room) => {
        console.log('room:', room);
        room.room.player1 = room.player1
        props.newRoom(room);
      })
      socket.on('deleteRoom', (room) => {
        props.deleteRoom(room);
      })
      socket.on('updateRoom', (room) => {
        console.log('data from updateRoom:', room);
        props.updateRoom(room);
      })
    }
  }

  refreshRooms();

  console.log('props.rooms', props.rooms)

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
                <Feed.Meta>Player1: {' ' + room.player1}</Feed.Meta>
                <Feed.Meta>Player2: {room.player2 ? ' ' + room.player2 : ' not yet assigned'}</Feed.Meta>
              </Feed.Content>
              {room.length === 1?
                <Button onClick={() => joinGame(roomName)} color="green">Join Game</Button> :
                <Button color="red" onClick={() => joinGame(roomName, 'spectator', props.rooms[roomName].gameIndex)}>Game Full - Watch Game</Button>
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
    socket: state.state.socket,
    loggedInUser: state.state.loggedInUser
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({ login, newRoom, deleteRoom, updateRoom }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(RoomsList));
