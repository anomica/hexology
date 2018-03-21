import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { setRooms, menuToggle } from '../../src/actions/actions.js';
import { Button } from 'semantic-ui-react';

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
    axios.get('/persistUser')
      .then(data => {
        console.log('data from session:', data);
      })
      .catch(err => {
        console.log('err from persistUser:', err);
      })
    axios.get('/rooms')
      .then(rooms => {
        this.props.setRooms(rooms.data);
      })
      .catch(err => {
        console.error('error retrieving rooms: ', err);
      })
  }

  render() {
    return (
      <div>
        <Button onClick={this.props.menuToggle}>Menu</Button>
        <SidebarLeft />
        <RoomsList />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ setRooms, menuToggle }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(Main);
