import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { selectHex, highlightNeighbors, drawBoard } from '../../src/actions/actions.js';
import axios from 'axios';
const uuidv4 = require('uuid/v4');

class Board extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.createBoard();
  }

  createBoard() {
    axios.post('/newBoard', {
      numRows: 5,
      numCols: 4
    })
      .then((data) => {
        this.props.drawBoard(data.data);
      })
      .catch(err => {
        console.log('error receiving new board:', err);
      });
  }

  handleClick(e, hex) {
    let neighbors = [];
    let hexCs = hex.coordinates;
    this.props.boardState.forEach(otherHex => {
      let oHexCs = otherHex.coordinates;
      if (oHexCs[0] === hexCs[0] && oHexCs[1] === hexCs[1]) {
        this.props.selectedHex ? this.props.selectHex(null) : this.props.selectHex(hex.index);
      }
      if ((oHexCs[0] <= hexCs[0] + 1 && oHexCs[0] >= hexCs[0] - 1) &&
          (oHexCs[1] <= hexCs[1] + 1 && oHexCs[1] >= hexCs[1] - 1) &&
          (oHexCs[1] <= hexCs[2] + 1 && oHexCs[2] >= hexCs[2] - 1))
      {
        neighbors.push(otherHex.index);
      }
    })
    this.props.highlightNeighbors(neighbors);

    e.target.classList.contains('selected') ?
    e.target.classList.remove('selected') :
    e.target.setAttribute('class', 'selected');
  }

  render() {
    return (
      <div className="Board">
        <HexGrid width={1200} height={800} viewBox="-50 -50 150 150">
          <Layout size={{ x: 10, y: 10 }} flat={false} spacing={1.2} origin={{ x: -40, y: -15 }}>
            {this.props.boardState ? this.props.boardState.map(hex => {
              return <Hexagon
                key={uuidv4()}
                className={
                  hex.hasResource ?
                  this.props.neighbors.indexOf(hex.index) > -1 ?
                  'neighbor' : 'resource' : null
                }
                onClick={(e) => this.handleClick(e, hex)}
                q={hex.coordinates[0]}
                r={hex.coordinates[1]}
                s={hex.coordinates[2]} />
            }): <div>Want to play with a friend? Send them this link: </div>}
          </Layout>
        </HexGrid>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    boardState: state.state.boardState,
    neighbors: state.state.neighbors,
    selectedHex: state.state.selectedHex
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ selectHex, highlightNeighbors, drawBoard }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(Board);
