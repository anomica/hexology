import React from 'react';
import { Header, Image, Table, Icon, Button, Modal, Form, Input, Divider } from 'semantic-ui-react';
import axios from 'axios';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import socketIOClient from "socket.io-client";
import { withRouter } from 'react-router';

class Leaderboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
      inviteSent: false,
      buttonMessage: 'Invite',
      modalOpen: false,
      email: '',
      challengeUser: '',
      room: ''
    }
    this.getUsers = this.getUsers.bind(this);
    this.sendEmail = this.sendEmail.bind(this);
    this.handleChange = this.handleChange.bind(this);
    // this.setUser = this.setUser.bind(this);
  }

  setUser(email, username) {
    this.setState({
      // email: email,
      // challengeUser: username,
      modalOpen: true
    });

    let socket = this.props.socket;
    socket.emit('challenge', {
      username: username,
      userPlayer: this.props.loggedInUser,
      gameType: 'public'
    });

    socket.on('challenge', data => {
      console.log('data yo: ',data)
      this.setState({
        room: data.room,
        email: data.player2.email
      });
    });
  }

  getUsers() {
    axios.get('/userwins')
    .then(res => {
      this.setState({
        users: res.data
      })
    })
  }

  sendEmail() {
    console.log('does this even work or nah')
    this.setState({ inviteSent: true, buttonMessage: 'Invite sent!' });

    let messageDefault = this.state.message ? this.state.message : 'Hello there! Please join me for an awesome game of Hexology!';

    this.props.socket.emit('sendEmail', {
      username: this.props.loggedInUser,
      email: this.state.email,
      message: messageDefault,
      room: this.state.room
    });

    setTimeout(() => this.setState({ modalOpen: false }), 2000);
  }

  handleChange(e, {name, value}) {
    this.setState({ [name] : value })
  }

  componentDidMount() {
    this.getUsers();
  }

  render() {
    return (
      <Table
        celled
        collapsing
        compact
        celled striped
        style={{ margin: 'auto' }}
      >

        <Table.Header>
          <Table.Row>
            <Table.HeaderCell colSpan='4' style={{textAlign: 'center'}}>
              <h3><Icon name='trophy' />Leaderboard</h3>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Header>
          <Table.Row>
            <Table.HeaderCell style={{textAlign: 'center'}}>Rank</Table.HeaderCell>
            <Table.HeaderCell style={{textAlign: 'center'}}>User</Table.HeaderCell>
            <Table.HeaderCell style={{textAlign: 'center'}}>Wins</Table.HeaderCell>
            <Table.HeaderCell style={{textAlign: 'center'}}>Losses</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {this.state.users.slice(0, 5).map( (user, key) => (
            <Table.Row key={key}>
              <Table.Cell style={{textAlign: 'center'}}>
                {key + 1}
              </Table.Cell>
              <Table.Cell>
                <Modal trigger={<Header as='h4' style={{cursor: 'pointer'}}>{user.username}</Header>}>
                  <Modal.Header>Profile: {user.username}</Modal.Header>
                  <Modal.Content>
                    <Modal.Description>
                      Rank: {key + 1}
                      <br/>
                      Wins: {user.wins}
                      <br/>
                      Losses: {user.losses}
                      <p/>
                      {this.props.loggedInUser !== 'anonymous' && this.props.loggedInUser !== user.username
                        ? <Button color='blue' key='blue' onClick={ () =>
                            this.setUser(user.email, user.username)
                          }>Challenge {user.username}!</Button>
                        : null
                      }

                      <Modal open={this.state.modalOpen} closeIcon onClose={() => this.setState({ modalOpen: false })}>
                        <Modal.Header>Challenge {user.username}!</Modal.Header>
                        <Modal.Content>
                          <Modal.Description>
                            <Form size={'large'} key={'small'}>
                              <Form.Group widths='equal'>
                                <Form.TextArea
                                  onChange={this.handleChange}
                                  label='Message'
                                  name={'message'}
                                  value={this.state.message}
                                  placeholder='Hello there! Please join me for an awesome game of Hexology!' />
                              </Form.Group>
                            </Form>
                          </Modal.Description>
                        </Modal.Content>
                        <Divider/>
                        <Modal.Actions>
                          <Button color={'blue'} onClick={() => this.state.inviteSent ? null : this.sendEmail()}>{this.state.buttonMessage}</Button>
                        </Modal.Actions>
                      </Modal>



                    </Modal.Description>
                  </Modal.Content>
                </Modal>
              </Table.Cell>
              <Table.Cell style={{textAlign: 'center'}}>
                {user.wins}
                <br/>
                ({Math.round((user.wins) / (user.wins + user.losses) * 100)}%)
              </Table.Cell>
              <Table.Cell style={{textAlign: 'center'}}>
                {user.losses}
                <br />
                ({Math.round((user.losses) / (user.wins + user.losses) * 100)}%)
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    )
  }
}


const mapStateToProps = state => {
  return {
    loggedInUser: state.state.loggedInUser,
    socket: state.state.socket
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({ }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Leaderboard));
