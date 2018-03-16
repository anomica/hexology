import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { selectHex, highlightNeighbors, highlightOpponents, drawBoard } from '../../src/actions/actions.js';
import axios from 'axios';
const uuidv4 = require('uuid/v4');

class Board extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {

    this.createBoard(5, 4);
  }

  createBoard(rows, cols) {
    axios.post('/newBoard', {
      numRows: rows,
      numCols: cols
    })
      .then((data) => {
        this.props.drawBoard(data.data);
      })
      .then(() => {
        let opponentControlled = [];
        this.props.boardState.forEach(hex => {
          if (hex.player === 'player2') {
            opponentControlled.push(hex.index);
          }
        })
        this.props.highlightOpponents(opponentControlled)
      })
      .catch(err => {
        console.log('error receiving new board:', err);
      });
  }


  movePlayer(targeHex) {
    axios.patch('/movePlayer', {
      targetHex: targetHex,
      boardState: this.props.boardState
    })
      .then(data => {
        console.log('data:', data);
        this.props.drawBoard(data.data);
      })
      .catch(err => {
        console.log('error receiving new board:', err);
      })
    }

  handleClick(e, hex) {
    if (hex.player === 'player1') {
      let neighbors = [];
      let targetCs = hex.coordinates;
      this.props.boardState.forEach(otherHex => {
        let oHexCs = otherHex.coordinates;
        if (oHexCs[0] === targetCs[0] && oHexCs[1] === targetCs[1]) {
          this.props.selectedHex ? this.props.selectHex(null) : this.props.selectHex(hex.index);
        }
        if ((oHexCs[0] <= targetCs[0] + 1 && oHexCs[0] >= targetCs[0] - 1) &&
        (oHexCs[1] <= targetCs[1] + 1 && oHexCs[1] >= targetCs[1] - 1) &&
        (oHexCs[2] <= targetCs[2] + 1 && oHexCs[2] >= targetCs[2] - 1) &&
        (hex.index !== otherHex.index))
        {
          neighbors.push(otherHex.index);
        }
      })
      this.props.highlightNeighbors(neighbors);
    }
  }

  render() {
    return (
      <div className="Board">
        <HexGrid width={1200} height={800} viewBox="-50 -50 150 150">
          <Layout size={{ x: 10, y: 10 }} flat={false} spacing={1.2} origin={{ x: -40, y: -15 }}>
            {this.props.boardState ? this.props.boardState.map(hex => {
              let targetClass = '';
              if (this.props.opponentControlled.indexOf(hex.index) > -1) {
                targetClass += 'opponent';
              } else if (this.props.selectedHex === hex.index) {
                targetClass += 'selected';
              } else if (hex.player === 'player1') {
                targetClass += 'friendly';
              } else if (this.props.neighbors.indexOf(hex.index) > -1) {
                targetClass += 'neighbor';
              } else if (hex.hasResource) {
                targetClass += 'resource';
              }
              return <Hexagon
                key={uuidv4()}
                className={targetClass}
                onClick={(e) => this.handleClick(e, hex)}
                q={hex.coordinates[0]}
                r={hex.coordinates[1]}
                s={hex.coordinates[2]}>
                <Text>
                  {hex.units.toString()}
                </Text>
              </Hexagon>
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
    selectedHex: state.state.selectedHex,
    opponentControlled: state.state.opponentControlled
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ selectHex, highlightNeighbors, drawBoard, highlightOpponents }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(Board);
