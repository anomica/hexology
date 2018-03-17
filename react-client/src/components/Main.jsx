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
