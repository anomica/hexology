import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Dropdown, List, Modal, Input, Card, Icon, Button, Transition, Header, Popup, Image, Content, Description, Label, Sidebar, Segment, Menu } from 'semantic-ui-react';
import { deployTroopsModal, updateBank, deployUnits } from '../../src/actions/actions.js';

const userPlayerBank = (props) => {
  return (
    <div>
      <List horizontal>
        <List.Item >
          <Image src="https://cdn2.iconfinder.com/data/icons/finance_icons/PNG/png64/gold_bullion.png" />
          <List.Content>
            <List.Header>Gold: {props.userPlayer === 'player1' || props.spectator ? props.playerOneResources.gold :
              props.playerTwoResources.gold}
            </List.Header>
          </List.Content>
        </List.Item>
        <List.Item >
          <Image src="https://cdn4.iconfinder.com/data/icons/free-game-icons/64/Tree.png" />
          <List.Content>
            <List.Header>Wood: {props.userPlayer === 'player1' || props.spectator ? props.playerOneResources.wood :
              props.playerTwoResources.wood}
            </List.Header>
          </List.Content>
        </List.Item>
        <List.Item>
          <Image src="https://cdn1.iconfinder.com/data/icons/CrystalClear/64x64/apps/Service-Manager.png" />
          <List.Content>
            <List.Header>Metal: {props.userPlayer === 'player1' || props.spectator ? props.playerOneResources.metal :
              props.playerTwoResources.metal}
            </List.Header>
          </List.Content>
        </List.Item>
        <List.Item>
          <Image src="https://png.icons8.com/metro/50/000000/sword.png" />
          <List.Content>
            <List.Header>Swordsmen: {props.userPlayer === 'player1' || props.spectator ? props.playerOneUnitBank.swordsmen :
              props.playerTwoUnitBank.swordsmen}
            </List.Header>
          </List.Content>
        </List.Item>
        <List.Item>
          <Image src="https://png.icons8.com/ios/50/000000/knight-shield-filled.png" />
          <List.Content>
            <List.Header>Knights: {props.userPlayer === 'player1' || props.spectator ? props.playerOneUnitBank.knights :
              props.playerTwoUnitBank.knights}
            </List.Header>
          </List.Content>
        </List.Item>
        <List.Item>
          <Image src="https://png.icons8.com/windows/50/000000/archer.png" />
          <List.Content>
            <List.Header>Archers: {props.userPlayer === 'player1' || props.spectator ? props.playerOneUnitBank.archers :
              props.playerTwoUnitBank.archers}
            </List.Header>
          </List.Content>
        </List.Item>
      </List>
    </div>
  )
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
  return bindActionCreators({ updateBank }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(userPlayerBank);