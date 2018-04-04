import React from 'react';
import { connect } from 'react-redux';
import { List, Image } from 'semantic-ui-react';


const opponentBank = (props) => {
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

  return (
    <div>
      {props.boardState ?
        <List>
          <List.Header>{props.spectator ? `Player 2's Bank:` : `Opponent's Bank:`}</List.Header>
          <List.Item>
            <Image src="https://cdn2.iconfinder.com/data/icons/finance_icons/PNG/png64/gold_bullion.png" />
            <List.Content>
              <List.Header>
                {props.userPlayer === 'player1' ? props.playerTwoResources.gold + ' gold' : props.playerOneResources.gold + ' gold'}
              </List.Header>
            </List.Content>
          </List.Item>
          <List.Item>
            <Image src="https://cdn4.iconfinder.com/data/icons/free-game-icons/64/Tree.png" />
            <List.Content>
              <List.Header>
                {props.userPlayer === 'player1' ? props.playerTwoResources.wood + ' wood' : props.playerOneResources.wood + ' wood'}
              </List.Header>
            </List.Content>
          </List.Item>
          <List.Item>
            <Image src="https://cdn1.iconfinder.com/data/icons/CrystalClear/64x64/apps/Service-Manager.png" />
            <List.Content>
              <List.Header>
                {props.userPlayer === 'player1' ? props.playerTwoResources.metal + ' metal' : props.playerOneResources.metal + ' metal'}
              </List.Header>
            </List.Content>
          </List.Item>
          <List.Item>
            <Image src="https://png.icons8.com/metro/50/000000/sword.png" />
            <List.Content>
              <List.Header>
                {props.userPlayer === 'player1' ? props.playerTwoUnitBank.swordsmen + ' swordsmen' : props.playerOneUnitBank.swordsmen + ' swordsmen'}
              </List.Header>
            </List.Content>
          </List.Item>
          <List.Item>
            <Image src="https://png.icons8.com/windows/50/000000/archer.png" />
            <List.Content>
              <List.Header>
                {props.userPlayer === 'player1' ? props.playerTwoUnitBank.archers + ' archers' : props.playerOneUnitBank.archers + ' archers'}
              </List.Header>
            </List.Content>
          </List.Item>
          <List.Item>
            <Image src="https://png.icons8.com/ios/50/000000/knight-shield-filled.png" />
            <List.Content>
              <List.Header>
                {props.userPlayer === 'player1' ? props.playerTwoUnitBank.knights + ' knights' : props.playerOneUnitBank.knights + ' knights'}
              </List.Header>
            </List.Content>
          </List.Item>
        </List> : <div></div>}
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
    boardState: state.state.boardState,
    spectator: state.state.spectator
  }
}


export default connect(mapStateToProps, null)(opponentBank);
