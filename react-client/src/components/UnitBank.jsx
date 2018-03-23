import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Modal, Input, Card, Icon, Button, Transition, Header, Popup, Image, Content, Description, Label, Sidebar, Segment, Menu } from 'semantic-ui-react';
import { updateBank, deployUnits } from '../../src/actions/actions.js';

class UnitBank extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      unitBeingDeployed: null,
      quantity: 0
    }
  }

  handleOpen(unit) {
    this.setState({
      open: true,
      unitBeingDeployed: unit
    })
  }

  handleClose() {
    this.setState({
      open: false
    })
  }

  handleSubmit() {
    console.log('quantity:', this.state.quantity);
    let playerBank;
    this.props.userPlayer === 'player1' ? playerBank = this.props.playerOneUnitBank
    : playerBank = this.props.playerTwoUnitBank;
    if (this.state.quantity > 0 && this.state.unitBeingDeployed && this.state.quantity < playerBank[this.state.unitBeingDeployed.toLowerCase()]) {
      this.props.deployUnits(this.props.userPlayer, this.state.unitBeingDeployed.toLowerCase(), this.state.quantity);
    } else {
      alert('hey yo this doesnt meet the submit requirements');
    }
  }

  componentDidMount() {
    this.props.socket.on('swordsmen', () => {
      console.log('received swordsmen transmition');
      console.log('this.props.userPlayer', this.props.userPlayer);
      this.props.updateBank(this.props.userPlayer, 'swordsmen');
    });
    this.props.socket.on('archers', () => {
      this.props.updateBank(this.props.userPlayer, 'archer');
    });
    this.props.socket.on('knights', () => {
      this.props.updateBank(this.props.userPlayer, 'knight');
    });
  }

  render() {
    const styles = {
      modal: {
        textAlign: 'right'
      }
    }

    if (this.props.userPlayer === this.props.currentPlayer) {
      return (
        <div>
          <Card>
            <Card.Header>Your Unit Reserve</Card.Header>
            <Card.Content>
              <Label color='blue' image className={'unitType'} onClick={this.handleOpen.bind(this, 'Swordsmen')}>
              <Image src="https://png.icons8.com/metro/50/000000/sword.png" />
                Deploy Swordsmen
              </Label>
              <Card.Description> 
                Swordsmen: 
                {this.props.userPlayer === 'player1' ? ' ' + this.props.playerOneUnitBank.swordsmen
              : ' ' + this.props.playerTwoUnitBank.swordsmen}
              </Card.Description>
            </Card.Content>
            <Card.Content>
              <Label color='green' image className={'unitType'} onClick={this.handleOpen.bind(this, 'Archer')} >
                <Image src="https://png.icons8.com/windows/50/000000/archer.png" />
                Deploy Archers
              </Label>
              <Card.Description>
                Archers: 
                {this.props.userPlayer === 'player1' ? ' ' + this.props.playerOneUnitBank.archer
                : ' ' + this.props.playerTwoUnitBank.archer}
              </Card.Description>
            </Card.Content>
            <Card.Content>
              <Label color='grey' image className={'unitType'} onClick={this.handleOpen.bind(this, 'Knight')} >
                <Image src="https://png.icons8.com/ios/50/000000/knight-shield-filled.png" />
                 Deploy Knights
              </Label>
            <Card.Description>
              Knights: 
              {this.props.userPlayer === 'player 1' ? ' ' + this.props.playerOneUnitBank.knight
              : ' ' + this.props.playerTwoUnitBank.knight}
            </Card.Description>
            </Card.Content>
          </Card>
          <Modal open={this.state.open} size={'mini'}>
            <Modal.Header>
              Choose Quanity {' ' + this.state.unitBeingDeployed}
            </Modal.Header>
            <Modal.Content style={styles.modal}>
              <Input placeholder='quantity' onChange={(e) => {this.setState({quantity: Number(e.target.value)})}} />
            </Modal.Content>
            <Modal.Actions>
              <Button color='grey' onClick={this.handleClose.bind(this)} >
                Cancel
               </Button>
              <Button color='blue' onClick={() => {this.handleClose(); this.handleSubmit();}} >
                Deploy
               </Button>
            </Modal.Actions>
          </Modal>
        </div>
      )
    }
    else {
      return <div></div>
    }
  }
}

const mapStateToProps = (state) => {
  return {
    socket: state.state.socket,
    userPlayer: state.state.userPlayer,
    playerOneUnitBank: state.state.playerOneUnitBank,
    playerTwoUnitBank: state.state.playerTwoUnitBank,
    currentPlayer: state.state.currentPlayer,
    deployment: state.state.deployment
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ updateBank, deployUnits }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(UnitBank);