import React from 'react';
import { Header, Image, Table, Icon } from 'semantic-ui-react';
import axios from 'axios';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import socketIOClient from "socket.io-client";
import { withRouter } from 'react-router';
import { newRoom, deleteRoom } from '../../src/actions/actions.js';

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
            <Table.HeaderCell colSpan='3' style={{textAlign: 'center'}}>
              <h3><Icon name='trophy' />Leaderboard</h3>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Header>
          <Table.Row>
            <Table.HeaderCell style={{textAlign: 'center'}}>Rank</Table.HeaderCell>
            <Table.HeaderCell style={{textAlign: 'center'}}>User</Table.HeaderCell>
            <Table.HeaderCell style={{textAlign: 'center'}}>Total Wins</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {this.state.users.map( (user, key) => (
            <Table.Row key={key}>
              <Table.Cell style={{textAlign: 'center'}}>
                {key + 1}
              </Table.Cell>
              <Table.Cell>
                <Header as='h4' image>
                  <Header.Content>
                    {user.username}
                  </Header.Content>
                </Header>
              </Table.Cell>
              <Table.Cell style={{textAlign: 'center'}}>
                {user.wins}
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
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({ newRoom, deleteRoom }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Leaderboard));
