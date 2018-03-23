import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Card, Icon, Button, Transition, Header, Popup, Image, Modal, Content, Description, Label, Sidebar, Segment, Menu } from 'semantic-ui-react';
import { updateResources, swordsmen, archers, knights } from '../../src/actions/actions.js';

class UnitShop extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: true,
      swordsmen: true,
      archers: true,
      knights: true
    }
  }

  open() {
    this.setState({
      open: true
    })
  }

  close() {
    this.setState({
      open: false
    })
  }

  toggleVisibility() {
    this.setState({
      open: !this.state.open
    })
  }

  buyUnitsServerRequest(buy) {
    return this.props.socket.emit('buy', buy);
  }

  buySwordsmen() {
    let resources;
    this.props.userPlayer === 'player1' ?
    resources = this.props.playerOneResources :
    resources = this.props.playerTwoResources;

    if (resources.gold >= 10 && resources.metal >= 10) {
      this.buyUnitsServerRequest({
        type: 'swordsmen',
        room: this.props.room,
        player: this.props.userPlayer,
        gameIndex: this.props.gameIndex,
        socketId: this.props.socket.id,
        room: this.props.room
      });
      this.setState({
        swordsmen: !this.state.swordsmen
      })
    } else {
      alert('Not enough resources!');
    }
  }

  buyArchers() {
    let resources;
    this.props.userPlayer === 'player1' ?
    resources = this.props.playerOneResources :
    resources = this.props.playerTwoResources;

    if (resources.gold >= 10 && resources.wood >= 20) {
      this.buyUnitsServerRequest({
        type: 'archers',
        room: this.props.room,
        player: this.props.userPlayer,
        gameIndex: this.props.gameIndex,
        socketId: this.props.socket.id,
        room: this.props.room
      });
      this.setState({
        archers: !this.state.archers
      })
    } else {
      alert('Not enough resources!');
    }
  }

  buyKnights() {
    let resources;
    this.props.userPlayer === 'player1' ?
    resources = this.props.playerOneResources :
    resources = this.props.playerTwoResources;

    if (resources.gold >= 20 && resources.wood >= 20 && resources.metal >= 20) {
      this.buyUnitsServerRequest({
        type: 'knights',
        room: this.props.room,
        player: this.props.userPlayer,
        gameIndex: this.props.gameIndex,
        socketId: this.props.socket.id,
        room: this.props.room
      });
      this.setState({
        knights: !this.state.knights
      })
    } else {
      alert('Not enough resources!');
    }
  }

  render() {
    let styles = {
      sidebar: {
        float: 'right',
        display: 'block',
        height: '100%',
        width: '30%',
        minWidth: '360px'
      }
    }

    return (
      <div>
        {/* <Button onClick={this.toggleVisibility.bind(this)}>UnitShop</Button> */}
        {console.log('this.props.showUnitShop:', this.props.showUnitShop)}
        <Card>
          <Card.Header>Purchase Units</Card.Header>
          <Card.Content>
            <Label color='blue' image className={'unitType'} onClick={this.buySwordsmen.bind(this)}>
            <Image src="https://png.icons8.com/metro/50/000000/sword.png" />
              Swordsmen
            </Label>
            <Card.Description>Cost: 10 gold, 10 metal</Card.Description>
          </Card.Content>
          <Card.Content>
            <Label color='green' image className={'unitType'} onClick={this.buyArchers.bind(this)}>
              <Image src="https://png.icons8.com/windows/50/000000/archer.png" />
              Archer
            </Label>
            <Card.Description>Cost: 10 gold, 20 wood</Card.Description>
          </Card.Content>
          <Card.Content>
            <Label color='grey' image className={'unitType'} onClick={this.buyKnights.bind(this)}>
              <Image src="https://png.icons8.com/ios/50/000000/knight-shield-filled.png" />
               Knight
            </Label>
          <Card.Description>Cost: 20 gold, 20 metal, 20 wood</Card.Description>
          </Card.Content>
        </Card>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    socket: state.state.socket,
    room: state.state.room,
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources,
    currentPlayer: state.state.currentPlayer,
    userPlayer: state.state.userPlayer,
    gameIndex: state.state.gameIndex,
    showUnitShop: state.state.showUnitShop
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ updateResources, swordsmen, archers, knights }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(UnitShop);
