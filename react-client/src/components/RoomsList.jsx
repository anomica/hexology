import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Segment, Image, Feed, Label, Button } from 'semantic-ui-react';
import socketIOClient from "socket.io-client";
import { withRouter } from 'react-router';
import Leaderboard from './Leaderboard.jsx';
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
        room.room.player1 = room.player1;
        props.newRoom(room);
      })
      socket.on('deleteRoom', (room) => {
        props.deleteRoom(room);
      })
      socket.on('updateRoom', (room) => {
        props.updateRoom(room);
      })
    }
  }

  refreshRooms();
  
  return (

    <Feed style={{textAlign: 'center', width: '45%', marginLeft: '20%', marginTop: 0, paddingTop: '20px'}}>
      <h1>Welcome to Hexology</h1>

      <Leaderboard />

      <h3>Currently Open Rooms: </h3>

      {props.rooms && Object.keys(props.rooms).length ?
        Object.keys(props.rooms).map((roomName, id) => {
        let room = props.rooms[roomName];
        console.log('room:', room);
        return (
          <Feed key={id}>
            <Feed.Content>
              <Feed.Label>New Game</Feed.Label>
              <Feed.Meta>Player1: {' ' + room.player1}</Feed.Meta>
              <Feed.Meta>Player2: {room.player2 ? ' ' + room.player2 : ' not yet assigned'}</Feed.Meta>
            </Feed.Content>
            {room.length === 1 ?
              <Button onClick={() => joinGame(roomName)} color="green">Join Game</Button> :
              <Button color="red" onClick={() => joinGame(roomName, 'spectator', props.rooms[roomName].gameIndex)}>Game Full - Watch Game</Button>
            }
          </Feed>
        )

      })
      : <div>No games currently Open. Start a new one!</div>}
    </Feed>
  )

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
