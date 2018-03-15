import React from 'react';
import { connect } from 'react-redux';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';

class Main extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
    }
  }

  handleClick(e) {
    console.log(e);
  }

  render() {
    return (
      <div className="Board">
        <HexGrid width={1200} height={800} viewBox="-50 -50 150 150">
          <Layout size={{ x: 10, y: 10 }} flat={false} spacing={1.2} origin={{ x: -40, y: -15 }}>
            <Hexagon onClick={this.handleClick.bind(this)} id="A" q={0} r={0} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="B" q={1} r={0} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="C" q={2} r={0} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="D" q={3} r={0} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="E" q={0} r={1} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="F" q={1} r={1} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="G" q={2} r={1} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="H" q={-1} r={2} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="I" q={0} r={2} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="J" q={1} r={2} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="K" q={2} r={2} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="L" q={-1} r={3} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="M" q={0} r={3} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="N" q={1} r={3} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="O" q={-2} r={4} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="P" q={-1} r={4} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="Q" q={0} r={4} s={0} />
            <Hexagon onClick={this.handleClick.bind(this)} id="R" q={1} r={4} s={0} />
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

export default connect(mapStateToProps, null)(Main);
