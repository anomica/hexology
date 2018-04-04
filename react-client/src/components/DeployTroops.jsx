import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Dropdown, List, Modal, Input, Card, Icon, Button, Transition, Header, Popup, Image, Content, Description, Label, Sidebar, Segment, Menu } from 'semantic-ui-react';
import { deployTroopsModal, updateBank, deployUnits } from '../../src/actions/actions.js';

class DeployTroops extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      quantity: null,
      unit: null,
      open: false
    }
  }

  componentDidMount() {
    this.props.socket.on('deployUnits', data => {
      this.props.deployUnits(data.player, data.unit, data.quantity, data.playerOneUnitBank, data.playerTwoUnitBank);
    })
  }

  setValue(e, data) {
    this.setState({ 
      value: data.value 
    });
  }

  handleClose() {
    this.setState({
      open: false
    });
  }

  handleOpen() {
    this.setState({
      open: true
    });
  }

  handleSubmit() {
    let playerBank;
    this.props.userPlayer === 'player1' ? playerBank = this.props.playerOneUnitBank
      : playerBank = this.props.playerTwoUnitBank;
    if (this.state.quantity > 0 && this.state.unit && this.state.quantity <= playerBank[this.state.unit.toLowerCase()]) {
      this.props.socket.emit('deployUnits', {
        player: this.props.userPlayer,
        unit: this.state.unit.toLowerCase(),
        quantity: this.state.quantity,
        bank: playerBank[this.state.unit.toLowerCase()],
        gameIndex: this.props.gameIndex,
        room: this.props.room
      })
    } else {
      alert('hey yo this doesnt meet the submit requirements');
    }
  }



  render() {
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
    ];

    return (
      <div>
        <Button onClick={this.handleOpen.bind(this)} >Deploy Troops</Button>
        <Modal open={this.state.open} size={'small'}>
          <Modal.Header>
            Choose unit type and quantity
            </Modal.Header>
          <Modal.Content>
            <Dropdown 
              placeholder='Select Unit' 
              options={dropDown}
              onChange={(e) => {this.setValue(e, e.target.value)}}
              selection
              value={this.state.unit} />
          </Modal.Content>
          <Modal.Content>
            <Input placeholder='quantity' onChange={(e) => { this.setState({ quantity: Number(e.target.value) }) }} />
          </Modal.Content>
          <Modal.Actions>
            <Button color='grey' onClick={this.handleClose.bind(this)} >
              Cancel
                </Button>
            <Button color='blue' onClick={() => { this.handleClose(); this.handleSubmit(); }} >
              Deploy
                </Button>
          </Modal.Actions>
        </Modal>
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
    deployTroopsModal: state.state.deployTroopsModal
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ updateBank, deployUnits }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(DeployTroops);