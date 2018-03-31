import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import axios from 'axios';
import { Button, Header, Image, Modal, Icon, List, Table, Confirm } from 'semantic-ui-react';
import socketIOClient from 'socket.io-client';
import { withRouter} from 'react-router';
import { setRoom } from '../../src/actions/actions.js';

class LoadGame extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      games: [],
      open: false,
      index: null,
      gameId: null,
    }
    this.retrieveGame = this.retrieveGame.bind(this);
    this.handleConfirm = this.handleConfirm.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.show = this.show.bind(this);
  }

  show(index, gameId) {
    this.setState({
      open: true,
      index: index,
      gameId: gameId
    });
  }

  handleConfirm(gameId) {
    let socket = this.props.socket;
    socket.emit('updateUserGamesList', {
      username: this.props.loggedInUser,
      gameId: gameId,
      socketId: this.props.socket.id
    })

    socket.on('updateUserGamesList', (data) => {
      this.setState({
        games: data.games,
        open: false
      });
    })
  }

  handleCancel() {
    this.setState({
      open: false,
      index: null,
      gameId: null
    })
  }

  async retrieveGame(roomId, gameIndex) {
    let socket = await this.props.socket;
    socket.emit('loadGame', {
      oldRoom: '*' + roomId,
      socketId: socket.id,
      username: this.props.loggedInUser,
      gameIndex: gameIndex
    });

    socket.on('updateRoom', data => {
      this.props.history.push({
        pathname: `/game/room?${data.room}`,
        state: {
          // game: data.game
        }
      });
    })
    this.props.close();
  }

  componentDidMount() {
    let socket = this.props.socket;
    socket.emit('getUserGames', {
      username: this.props.loggedInUser,
      socketId: this.props.socket.id
    })
    socket.on('getUserGames', data => {
      this.setState({ games: data.games })
    })
  }

  render() {
    return (
      <Modal
        open={this.props.open}
        onClose={this.props.close}
        closeIcon
      >
        <Modal.Header>My Current Games</Modal.Header>
        <Modal.Content image scrolling>
          <Modal.Description>
          { (this.state.games.length > 0)
            ? <Table celled striped selectable color='green' key='green'>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell rowSpan='2' style={{textAlign: 'center'}}>Game</Table.HeaderCell>
                    <Table.HeaderCell colSpan='2' style={{textAlign: 'center'}}>Player One</Table.HeaderCell>
                    <Table.HeaderCell colSpan='2' style={{textAlign: 'center'}}>Player Two</Table.HeaderCell>
                    <Table.HeaderCell rowSpan='2' style={{textAlign: 'center'}}>Current Turn</Table.HeaderCell>
                    <Table.HeaderCell rowSpan='2'/>
                  </Table.Row>
                  <Table.Row>
                    <Table.HeaderCell style={{textAlign: 'center'}}>Resources</Table.HeaderCell>
                    <Table.HeaderCell style={{textAlign: 'center'}}>Units</Table.HeaderCell>
                    <Table.HeaderCell style={{textAlign: 'center'}}>Resources</Table.HeaderCell>
                    <Table.HeaderCell style={{textAlign: 'center'}}>Units</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {this.state.games.map( (game, i) => 
                    <Table.Row key={i}>
                      <Table.Cell>
                        #{i + 1} (ID: {game.game_id})
                        <br/>
                        {this.props.loggedInUser === game.player1_username
                          ? <div>
                              <div><strong>Player 1: {game.player1_username} (You!) </strong></div>
                              <div>Player 2: {game.player2_username}</div>
                            </div>
                          : <div>
                              <div>Player 1: {game.player1_username}</div>
                              <div><strong>Player 2: {game.player2_username} (You!)</strong></div>
                            </div>
                        }
                        Room ID: {game.room_id}
                      </Table.Cell>
                      <Table.Cell>
                        Gold: {game.p1_gold}
                        <br/>
                        Wood: {game.p1_wood}
                        <br/>
                        Metal: {game.p1_metal}
                      </Table.Cell>

                      <Table.Cell style={{textAlign: 'center'}}>
                        {game.p1_total_units}
                      </Table.Cell>

                      <Table.Cell>
                        Gold: {game.p2_gold}
                        <br/>
                        Wood: {game.p2_wood}
                        <br/>
                        Metal: {game.p2_metal}
                      </Table.Cell>

                      <Table.Cell style={{textAlign: 'center'}}>
                        {game.p2_total_units}
                      </Table.Cell>

                      <Table.Cell>{game.current_player}</Table.Cell>

                      <Table.Cell>
                        <Button size='tiny' color='blue'
                          onClick={() => {
                            this.retrieveGame(game.room_id, game.game_index);
                          }}
                        >Load Game</Button>
                        <br/>
                        <Button size='tiny' color='red' style={{marginTop: '2%'}}
                          onClick={ () => {this.show(i, game.game_id)} }
                        >Delete Game</Button>
                        <Confirm
                          header='Confirm Delete'
                          content="Are you sure you want to delete this game? There's no turning back!"
                          cancelButton='Nevermind'
                          confirmButton="Let's do it!"
                          open={this.state.open}
                          onCancel={this.handleCancel}
                          onConfirm={ () => {
                            this.handleConfirm(this.state.gameId);
                          }}
                        />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table>
              : <div>You currently have no existing games!</div>
            }
          </Modal.Description>
        </Modal.Content>
      </Modal>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    socket: state.state.socket,
    loggedInUser: state.state.loggedInUser,
    room: state.state.room,
    userPlayer: state.state.userPlayer
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ setRoom }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(LoadGame))