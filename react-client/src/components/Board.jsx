import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { selectHex, highlightNeighbors, highlightOpponents, moveUnits, drawBoard, setGameIndex } from '../../src/actions/actions.js';
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
        this.props.drawBoard(data.data.board);
        this.props.setGameIndex(data.data.gameIndex);
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


  sendMoveRequest(updatedOrigin, originIndex, updatedTarget, targetIndex) {
    axios.patch('/move', {
      updatedOrigin: updatedOrigin,
      originIndex: originIndex,
      updatedTarget: updatedTarget,
      targetIndex: targetIndex,
      gameIndex: this.props.gameIndex
    })
    .then(data => {
      data.status === 201 ?
      this.props.moveUnits(updatedOrigin, originIndex, updatedTarget, targetIndex) : null;
    })
    .catch(err => {
      alert(err);
      console.error(err);
    });
  }

  handleClick(e, hex) {
    if (!this.props.selectedHex.hasOwnProperty('index') || this.props.selectedHex.index === hex.index) {
      this.handleSelectClick(e, hex);
    } else {
      this.handleMoveClick(e, hex);
    }
  }

  handleSelectClick(e, hex) {
    if (hex.player === 'player1') {
      let neighbors = [];
      let targetCs = hex.coordinates;
      this.props.boardState.forEach(otherHex => {
        let oHexCs = otherHex.coordinates;
        if (oHexCs[0] === targetCs[0] && oHexCs[1] === targetCs[1]) {
          this.props.selectedHex.hasOwnProperty('index') ? this.props.selectHex({}) : this.props.selectHex(hex);
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

  handleMoveClick(e, hex) {
    if (this.props.neighbors.indexOf(hex.index) > -1) {
      let board = this.props.boardState;
      let origin = this.props.selectedHex;
      let originIndex = board.indexOf(origin);
      let targetIndex = board.indexOf(hex);
      let target = board[targetIndex];

      if (target.player === 'player2') {
        axios.patch('/attack', {
          origin: origin,
          originIndex: originIndex,
          target: target,
          targetIndex: targetIndex
        })
        .then(data => {
          console.log(data);
        })
        .catch(err => {
          console.error(err);
        })
      }

      let updatedTarget = {
        ...target,
        units: target.units += origin.units,
        player: 'player1'
      }
      let updatedOrigin = {
        ...origin,
        units: 0,
        player: null
      }
      this.sendMoveRequest(updatedOrigin, originIndex, updatedTarget, targetIndex);
    } else {
      alert('AAAAAAAA')
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
              } else if (this.props.selectedHex.index === hex.index) {
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
    opponentControlled: state.state.opponentControlled,
    gameIndex: state.state.gameIndex
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ selectHex, highlightNeighbors, drawBoard, highlightOpponents, moveUnits, setGameIndex }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(Board);
