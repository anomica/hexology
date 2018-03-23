import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Card, Icon, Button, Transition, Header, Popup, Image, Modal, Content, Description, Label, Sidebar, Segment, Menu } from 'semantic-ui-react';
import { updateBank } from '../../src/actions/actions.js';

class UnitBank extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
 
    }
  }

  componentDidMount() {
    setTimeout(console.log('this.props:', this.props), 2000);
    // this.props.socket.on('swordsmen', () => {
    //   this.props.updateBank(this.props.userPlayer, 'swordsman');
    // });
    // this.props.socket.on('archers', () => {
    //   this.props.updateBank(this.props.userPlayer, 'archers');
    // });
    // this.props.socket.on('knights', () => {
    //   this.props.updateBank(this.props.userPlayer, 'knights');
    // });
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
                Swordsmen
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
                Archer
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
                 Knight
              </Label>
            <Card.Description>
              Knight: 
              {this.props.userPlayer === 'player 1' ? ' ' + this.props.playerOneUnitBank.knight
              : ' ' + this.props.playerTwoUnitBank.knight}
            </Card.Description>
            </Card.Content>
          </Card>
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