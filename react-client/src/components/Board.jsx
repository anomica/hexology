import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';
import { bindActionCreators } from 'redux';
import { selectHex } from '../../src/actions/actions.js';

import SidebarLeft from './Sidebar.jsx';

class Board extends React.Component {
  constructor(props) {
    super(props);

    this.state = {

    }
  }

  render() {
    return (
      <div className="Board" style={{float: 'right'}}>
        <HexGrid height={800} viewBox="-50 -50 150 150">
          <Layout size={{ x: 10, y: 10 }} flat={false} spacing={1.2} origin={{ x: -40, y: -15 }}>
            <Hexagon onClick={() => this.props.selectHex("A")} id="A" q={0} r={0} s={0} />
            <Hexagon onClick={() => this.props.selectHex("B")} id="B" q={1} r={0} s={0} />
            <Hexagon onClick={() => this.props.selectHex("C")} id="C" q={2} r={0} s={0} />
            <Hexagon onClick={() => this.props.selectHex("D")} id="D" q={3} r={0} s={0} />
            <Hexagon onClick={() => this.props.selectHex("E")} id="E" q={0} r={1} s={0} />
            <Hexagon onClick={() => this.props.selectHex("F")} id="F" q={1} r={1} s={0} />
            <Hexagon onClick={() => this.props.selectHex("G")} id="G" q={2} r={1} s={0} />
            <Hexagon onClick={() => this.props.selectHex("H")} id="H" q={-1} r={2} s={0} />
            <Hexagon onClick={() => this.props.selectHex("I")} id="I" q={0} r={2} s={0} />
            <Hexagon onClick={() => this.props.selectHex("J")} id="J" q={1} r={2} s={0} />
            <Hexagon onClick={() => this.props.selectHex("K")} id="K" q={2} r={2} s={0} />
            <Hexagon onClick={() => this.props.selectHex("L")} id="L" q={-1} r={3} s={0} />
            <Hexagon onClick={() => this.props.selectHex("M")} id="M" q={0} r={3} s={0} />
            <Hexagon onClick={() => this.props.selectHex("N")} id="N" q={1} r={3} s={0} />
            <Hexagon onClick={() => this.props.selectHex("O")} id="O" q={-2} r={4} s={0} />
            <Hexagon onClick={() => this.props.selectHex("P")} id="P" q={-1} r={4} s={0} />
            <Hexagon onClick={() => this.props.selectHex("Q")} id="Q" q={0} r={4} s={0} />
            <Hexagon onClick={() => this.props.selectHex("R")} id="R" q={1} r={4} s={0} />
          </Layout>
        </HexGrid>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {

  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ selectHex }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(Board);
