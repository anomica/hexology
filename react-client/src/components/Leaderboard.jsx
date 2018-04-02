import React from 'react';
import { Header, Image, Table, Icon, Button, Modal } from 'semantic-ui-react';
import axios from 'axios';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import socketIOClient from "socket.io-client";
import { withRouter } from 'react-router';
// import { newRoom, deleteRoom } from '../../src/actions/actions.js';

class Leaderboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: []
    }
    this.getUsers = this.getUsers.bind(this);
  }

  getUsers() {
    axios.get('/userwins')
    .then(res => {
      this.setState({
        users: res.data
      })
    })
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
          {this.state.users.map( (user, key) => (
            <Table.Row key={key}>
              <Table.Cell style={{textAlign: 'center'}}>
                {key + 1}
              </Table.Cell>
              <Table.Cell>
                <Modal trigger={<Header as='h4' style={{cursor: 'pointer'}}>{user.username}</Header>}>
                  <Modal.Header>Profile: {user.username}</Modal.Header>
                  <Modal.Content>
                    <Modal.Description>
                      Wins: {user.wins}
                      <br/>
                      Losses: {user.losses}
                      <p/>
                      {this.props.loggedInUser !== 'anonymous'
                        ? <Button color='blue' key='blue'>Challenge</Button>
                        : null
                      }
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
    loggedInUser: state.state.loggedInUser
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({ }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Leaderboard));
