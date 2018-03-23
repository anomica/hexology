import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Modal, Input, Card, Icon, Button, Transition, Header, Popup, Image, Content, Description, Label, Sidebar, Segment, Menu } from 'semantic-ui-react';
import { updateBank } from '../../src/actions/actions.js';

class UnitBank extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      unitBeingDeployed: null,
      quantity: 0
    }
  }

  handleOpen() {
    this.setState({
      open: !this.state.open
    })
  }

  handleSubmit() {
    // send to reducer
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
    if (this.props.userPlayer) {
      return (
        <div>
          <Card>
            <Card.Header>Your Unit Reserve</Card.Header>
            <Card.Content>
              <Label color='blue' image className={'unitType'} >
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
              <Label color='green' image className={'unitType'} >
                <Image src="https://png.icons8.com/windows/50/000000/archer.png" />
                Deploy Archers
              </Label>
              <Card.Description>
                Archer: 
                {this.props.userPlayer === 'player1' ? ' ' + this.props.playerOneUnitBank.archer
                : ' ' + this.props.playerTwoUnitBank.archer}
              </Card.Description>
            </Card.Content>
            <Card.Content>
              <Label color='grey' image className={'unitType'} >
                <Image src="https://png.icons8.com/ios/50/000000/knight-shield-filled.png" />
                 Deploy Knights
              </Label>
            <Card.Description>
              Knight: 
              {this.props.userPlayer === 'player 1' ? ' ' + this.props.playerOneUnitBank.knight
              : ' ' + this.props.playerTwoUnitBank.knight}
            </Card.Description>
            </Card.Content>
          </Card>
          <Modal open={this.open}>
            <Modal.Header>
              Choose Quanity {' ' + this.unitBeingDeployed}
            </Modal.Header>
            <Modal.Content >
              <Input placeholder='quantity' onChange={(e) => {this.setState({quantity: Number(e)})}} />
              <Button onClick={this.handleSubmit.bind(this)}>Deploy</Button>
            </Modal.Content>
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
    playerTwoUnitBank: state.state.playerTwoUnitBank
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ updateBank }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(UnitBank);