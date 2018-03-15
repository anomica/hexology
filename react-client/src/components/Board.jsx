import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';

class Board extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
    }
  }

  handleClick(letter) {
    console.log(letter);
  }

  render() {
    return (
      <div className="Board">
        <HexGrid width={1200} height={800} viewBox="-50 -50 150 150">
          <Layout size={{ x: 10, y: 10 }} flat={false} spacing={1.2} origin={{ x: -40, y: -15 }}>
            <Hexagon onClick={() => this.handleClick("A")} id="A" q={0} r={0} s={0} />
            <Hexagon onClick={() => this.handleClick("B")} id="B" q={1} r={0} s={0} />
            <Hexagon onClick={() => this.handleClick("C")} id="C" q={2} r={0} s={0} />
            <Hexagon onClick={() => this.handleClick("D")} id="D" q={3} r={0} s={0} />
            <Hexagon onClick={() => this.handleClick("E")} id="E" q={0} r={1} s={0} />
            <Hexagon onClick={() => this.handleClick("F")} id="F" q={1} r={1} s={0} />
            <Hexagon onClick={() => this.handleClick("G")} id="G" q={2} r={1} s={0} />
            <Hexagon onClick={() => this.handleClick("H")} id="H" q={-1} r={2} s={0} />
            <Hexagon onClick={() => this.handleClick("I")} id="I" q={0} r={2} s={0} />
            <Hexagon onClick={() => this.handleClick("J")} id="J" q={1} r={2} s={0} />
            <Hexagon onClick={() => this.handleClick("K")} id="K" q={2} r={2} s={0} />
            <Hexagon onClick={() => this.handleClick("L")} id="L" q={-1} r={3} s={0} />
            <Hexagon onClick={() => this.handleClick("M")} id="M" q={0} r={3} s={0} />
            <Hexagon onClick={() => this.handleClick("N")} id="N" q={1} r={3} s={0} />
            <Hexagon onClick={() => this.handleClick("O")} id="O" q={-2} r={4} s={0} />
            <Hexagon onClick={() => this.handleClick("P")} id="P" q={-1} r={4} s={0} />
            <Hexagon onClick={() => this.handleClick("Q")} id="Q" q={0} r={4} s={0} />
            <Hexagon onClick={() => this.handleClick("R")} id="R" q={1} r={4} s={0} />
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

export default connect(mapStateToProps, null)(Board);
