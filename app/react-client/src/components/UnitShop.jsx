import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Card, Icon, Button, Transition, Header, Popup, Image, Modal, Content, Description, Label, Sidebar, Segment, Menu } from 'semantic-ui-react';
import { updateBank, updateResources, swordsmen, archers, knights } from '../../src/actions/actions.js';

class UnitShop extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      swordsmen: true,
      archers: true,
      knights: true,
      notEnoughResourcesModalOpen: false,
      resourceNeeded: ''
    }
  }

  componentDidMount() {
    this.props.socket.on('swordsmen', data => {
      if (this.userPlayer === this.currentPlayer) {
        this.props.updateBank(data.playerOneUnitBank, data.playerTwoUnitBank);
      }
    });
    this.props.socket.on('archers', data => {
      this.props.updateBank(data.playerOneUnitBank, data.playerTwoUnitBank);
    });
    this.props.socket.on('knights', data => {
      this.props.updateBank(data.playerOneUnitBank, data.playerTwoUnitBank);
    });
  }

  show() {
    this.setState({
      open: true
    })
  }

  close() {
    this.setState({
      open: false,
      swordsmen: true,
      archers: true,
      knights: true
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
    if (resources.gold >= 10 && resources.metal >= 10 && this.props.userPlayer === this.props.currentPlayer) {
      this.buyUnitsServerRequest({
        type: 'swordsmen',
        room: this.props.room,
        player: this.props.userPlayer,
        gameIndex: this.props.gameIndex,
        socketId: this.props.socket.id
      });
      this.setState({
        swordsmen: !this.state.swordsmen
      })
    } else {
      this.setState({
        notEnoughResourcesModalOpen: true,
        resourceNeeded: resources.gold < 10 && resources.metal < 10 ? 'Gold and Metal' : resources.gold < 10 ? 'Gold' : 'Metal'
      })
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
        socketId: this.props.socket.id
      });
      this.setState({
        archers: !this.state.archers
      })
    } else {
      this.setState({
        notEnoughResourcesModalOpen: true,
        resourceNeeded: resources.gold < 10 && resources.wood < 20 ? 'Gold and Wood' : resources.gold < 10 ? 'Gold' : 'Wood'
      })
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
        socketId: this.props.socket.id
      });
      this.setState({
        knights: !this.state.knights
      })
    } else {
      this.setState({
        notEnoughResourcesModalOpen: true,
        resourceNeeded: resources.gold < 20 && resources.metal < 20 && resources.metal ? 'Gold, Wood, and Metal' :
          resources.gold < 20 && resources.wood < 20 ? 'Gold and Wood' :
          resources.gold < 20 && resources.metal < 20 ? 'Gold and Metal' :
          resources.gold < 20 ? 'Gold' :
          resources.wood < 20 ? 'Wood' : 'Metal'
      })
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
        <Popup trigger={<Button style={{ marginTop: '30px' }} secondary onClick={() => this.show('blurring')}>Unit Store</Button>}>
          <Popup.Header>Spend your resources on new units!</Popup.Header>
        </Popup>

        <Modal open={this.state.open} className={'unitShop'} size={'small'}
          style={{ textAlign: 'center' }} closeIcon onClose={this.close.bind(this)}>
          <Modal.Header>Unit Shop</Modal.Header>
          <Modal.Content>
            <Modal.Description>
              Your Resources: {this.props.userPlayer === 'player1' ?
                `${this.props.playerOneResources.gold} Gold, ${this.props.playerOneResources.wood} Wood, ${this.props.playerOneResources.metal} Metal` :
                `${this.props.playerTwoResources.gold} Gold, ${this.props.playerTwoResources.wood} Wood, ${this.props.playerTwoResources.metal} Metal`
              }
            </Modal.Description>
            <Modal.Description>
              <Transition animation={'jiggle'} duration={'1000'} visible={this.state.swordsmen}>
                <Label color='blue' image className={'unitType'} onClick={this.buySwordsmen.bind(this)}>
                  <Image src="./images/sword.png" />
                  Swordsmen
                  <Label.Detail>Cost: 10 gold, 10 metal</Label.Detail>
                </Label>
              </Transition>
              <Transition animation={'jiggle'} duration={'1000'} visible={this.state.archers}>
                <Label color='green' image className={'unitType'} onClick={this.buyArchers.bind(this)}>
                  <Image src="./images/archer.png" />
                  Archer
                  <Label.Detail>Cost: 10 gold, 20 wood</Label.Detail>
                </Label>
              </Transition>
              <Transition animation={'jiggle'} duration={'1000'} visible={this.state.knights}>
                <Label color='grey' image className={'unitType'} onClick={this.buyKnights.bind(this)}>
                  <Image src="./images/knight.png" />
                  Knight
                  <Label.Detail>Cost: 20 gold, 20 metal, 20 wood</Label.Detail>
                </Label>
              </Transition>
            </Modal.Description>
          </Modal.Content>
        </Modal>
        <Transition animation={'fade up'} duration={'1000'} visible={this.state.notEnoughResourcesModalOpen}>
          <Modal open={this.state.notEnoughResourcesModalOpen} closeIcon onClose={() => this.setState({ notEnoughResourcesModalOpen: false })} size={'mini'} style={{ textAlign: 'center' }}>
            <Modal.Header>Not Enough {this.state.resourceNeeded}</Modal.Header>
            <Modal.Content>
              You require additional pylons.
              <Image style={{margin: 'auto', height: '150px'}} src='./images/pylon.png'/>
            </Modal.Content>
          </Modal>
        </Transition>
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
  return bindActionCreators({ updateBank, swordsmen, archers, knights }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(UnitShop);
