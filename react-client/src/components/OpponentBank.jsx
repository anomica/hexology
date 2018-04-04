import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Dropdown, List, Modal, Input, Card, Icon, Button, Transition, Header, Popup, Image, Content, Description, Label, Sidebar, Segment, Menu } from 'semantic-ui-react';
import { deployTroopsModal, updateBank, deployUnits } from '../../src/actions/actions.js';

class OpponentBank extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      unitBeingDeployed: null,
      quantity: 0
    }
  }


  componentDidMount() {
    this.props.socket.on('deployUnits', data => {
      this.props.deployUnits(data.player, data.unit, data.quantity, data.playerOneUnitBank, data.playerTwoUnitBank);
    })
  }

  handleOpen(unit) {
    this.setState({
      open: true,
      unitBeingDeployed: unit
    })
  }

  handleClose() {
    this.props.deployTroopsModal(false);
  }

  handleSubmit() {
    let playerBank;
    this.props.userPlayer === 'player1' ? playerBank = this.props.playerOneUnitBank
      : playerBank = this.props.playerTwoUnitBank;
    if (this.state.quantity > 0 && this.state.unitBeingDeployed && this.state.quantity <= playerBank[this.state.unitBeingDeployed.toLowerCase()]) {
      this.props.socket.emit('deployUnits', {
        player: this.props.userPlayer,
        unit: this.state.unitBeingDeployed.toLowerCase(),
        quantity: this.state.quantity,
        bank: playerBank[this.state.unitBeingDeployed.toLowerCase()],
        gameIndex: this.props.gameIndex,
        room: this.props.room
      })
    } else {
      alert('hey yo this doesnt meet the submit requirements');
    }
  }


  render() {
    const styles = {
      modal: {
        textAlign: 'right'
      }
    }

    const dropDown = [
      {
        text: 'Swordsmen',
        value: 'swordsmen',
        image: { avatar: true, src: 'https://png.icons8.com/metro/50/000000/sword.png' }
      },
      {
        text: 'Archers',
        value: 'archers',
        image: { avatar: false, src: 'https://png.icons8.com/windows/50/000000/archer.png' }
      },
      {
        text: 'Knights',
        value: 'knights',
        image: { avatar: false, src: 'https://png.icons8.com/ios/50/000000/knight-shield-filled.png' }
      }

    ]

    console.log(this.props.room);
    console.log('this.props.rooms:', this.props.rooms);

    return (
      <div>
        {this.props.boardState ?
          <List>
            <List.Header>{this.props.spectator ? `Player 2's Bank:` : `Opponent's Bank:`}</List.Header>
            <List.Item>
              <Image src="https://cdn2.iconfinder.com/data/icons/finance_icons/PNG/png64/gold_bullion.png" />
              <List.Content>
                <List.Header>
                  {this.props.userPlayer === 'player1' ? this.props.playerTwoResources.gold + ' gold' : this.props.playerOneResources.gold + ' gold'}
                </List.Header>
              </List.Content>
            </List.Item>
            <List.Item>
              <Image src="https://cdn4.iconfinder.com/data/icons/free-game-icons/64/Tree.png" />
              <List.Content>
                <List.Header>
                  {this.props.userPlayer === 'player1' ? this.props.playerTwoResources.wood + ' wood' : this.props.playerOneResources.wood + ' wood'}
                </List.Header>
              </List.Content>
            </List.Item>
            <List.Item>
              <Image src="https://cdn1.iconfinder.com/data/icons/CrystalClear/64x64/apps/Service-Manager.png" />
              <List.Content>
                <List.Header>
                  {this.props.userPlayer === 'player1' ? this.props.playerTwoResources.metal + ' metal' : this.props.playerOneResources.metal + ' metal'}
                </List.Header>
              </List.Content>
            </List.Item>
            <List.Item>
              <Image src="https://png.icons8.com/metro/50/000000/sword.png" />
              <List.Content>
                <List.Header>
                  {this.props.userPlayer === 'player1' ? this.props.playerTwoUnitBank.swordsmen + ' swordsmen' : this.props.playerOneUnitBank.swordsmen + ' swordsmen'}
                </List.Header>
              </List.Content>
            </List.Item>
            <List.Item>
              <Image src="https://png.icons8.com/windows/50/000000/archer.png" />
              <List.Content>
                <List.Header>
                  {this.props.userPlayer === 'player1' ? this.props.playerTwoUnitBank.archers + ' archers' : this.props.playerOneUnitBank.archers + ' archers'}
                </List.Header>
              </List.Content>
            </List.Item>
            <List.Item>
              <Image src="https://png.icons8.com/ios/50/000000/knight-shield-filled.png" />
              <List.Content>
                <List.Header>
                  {this.props.userPlayer === 'player1' ? this.props.playerTwoUnitBank.knights + ' knights' : this.props.playerOneUnitBank.knights + ' knights'}
                </List.Header>
              </List.Content>
            </List.Item>
          </List> : <div></div>}
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    socket: state.state.socket,
    userPlayer: state.state.userPlayer,
    playerOneUnitBank: state.state.playerOneUnitBank,
    playerTwoUnitBank: state.state.playerTwoUnitBank,
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources,
    currentPlayer: state.state.currentPlayer,
    deployment: state.state.deployment,
    gameIndex: state.state.gameIndex,
    room: state.state.room,
    boardState: state.state.boardState,
    deployTroopsModal: state.state.deployTroopsModal,
    spectator: state.state.spectator
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ updateBank, deployUnits, deployTroopsModal }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(OpponentBank);
