import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Segment, Image, Feed, Label, Button, Modal, Header, Icon, Table } from 'semantic-ui-react';
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
        room.room.player1Wins = room.player1Wins;
        room.room.player1Losses = room.player1Losses;
        room.room.player1Email = room.player1Email;
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

    <Feed style={{margin: 'auto', textAlign: 'center', width: '55%',  marginTop: 0, paddingTop: '20px'}}>
      <h1>Welcome to Hexology</h1>

      <Leaderboard />

      <h3>Current Games: </h3>

        {props.rooms && Object.keys(props.rooms).length ?
          Object.keys(props.rooms).map((roomName, id) => {
          let room = props.rooms[roomName];
          return (
            <Table celled selectable collapsing key={id} style={{ margin: '2%', display: 'inline-block' }}>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell colSpan='2' style={{ textAlign: 'center' }}>
                    {room.player1 && room.player2
                      ? `Game Full`
                      : (<div><Icon loading name='spinner' /><span>Waiting for another player</span></div>)
                    }
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                <Table.Row>
                  <Table.Cell>Player 1</Table.Cell>
                  <Table.Cell>
                    { room.player1 !== 'anonymous'
                      ? <Modal trigger={<Header as='h4' style={{cursor: 'pointer'}}><Icon name='user' />{' ' + room.player1}</Header>}>
                        <Modal.Header>Profile: {' ' + room.player1}</Modal.Header>
                        <Modal.Content>
                          <Modal.Description>
                            {/* Rank: TBD
                            <br/> */}
                            Wins: {' ' + room.player1Wins}
                            <br/>
                            Losses: {' ' + room.player1Losses}
                            <p/>
                            { room.player1 !== props.loggedInUser
                              ? null
                              // ? <Button>Challenge {' ' + room.player1}</Button>
                              : null
                            }
                          </Modal.Description>
                        </Modal.Content>
                      </Modal>
                      : <span><Icon name='user outline' />{' ' + room.player1}</span>
                    }
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Player 2</Table.Cell>
                  <Table.Cell>
                    { room.player2
                      ? room.player2 !== 'anonymous'
                        ? <Modal trigger={<Header as='h4' style={{cursor: 'pointer'}}><Icon name='user' />{' ' + room.player2}</Header>}>
                          <Modal.Header>Profile: {' ' + room.player2}</Modal.Header>
                          <Modal.Content>
                            <Modal.Description>
                              {/* Rank: TBD
                              <br/> */}
                              Wins: {' ' + room.player2Wins}
                              <br/>
                              Losses: {' ' + room.player2Losses}
                              <p/>
                              { room.player2 !== props.loggedInUser
                                ? null
                                // ? <Button>Challenge {' ' + room.player2}</Button>
                                : null
                              }
                            </Modal.Description>
                          </Modal.Content>
                        </Modal>
                        : <span><Icon name='user outline' />{' ' + room.player2}</span>
                      : ' Not yet assigned'
                    }
                  </Table.Cell>
                </Table.Row>
                <Table.Row colSpan='2'>
                  <Table.HeaderCell colSpan='2'>
                    {room.length === 1 ?
                      <Button fluid onClick={() => joinGame(roomName)} color="green">Join Game</Button> :
                      <Button fluid color="red" onClick={() => joinGame(roomName, 'spectator', props.rooms[roomName].gameIndex)}>Watch Game</Button>
                    }
                  </Table.HeaderCell>
                </Table.Row>
            </Table.Body>
            </Table>
          )
        
        })
        : <div>No games currently open. Start a new one!</div>}
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
