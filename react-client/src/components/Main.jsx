import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { selectHex, highlightNeighbors, highlightOpponents, moveUnits, drawBoard } from '../../src/actions/actions.js';
import axios from 'axios';
const uuidv4 = require('uuid/v4');

import SidebarLeft from './Sidebar.jsx';

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
  }

  render() {
    return (
      <div>
        <SidebarLeft />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({}, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(Main);
