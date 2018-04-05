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
      image: { avatar: true, src: './images/sword.png' }
    },
    {
      text: 'Archers',
      value: 'archers',
      image: { avatar: false, src: './images/archer.png' }
    },
    {
      text: 'Knights',
      value: 'knights',
      image: { avatar: false, src: './images/knight.png' }
    }
  ]

  return (
    <div>
      {props.boardState ?
        <List>
          <List.Header>{props.spectator ? `Player 2's Bank:` : `Opponent's Bank:`}</List.Header>
          <List.Item>
            <Image height="100px" style={{marginBottom: '-50px'}} src="./images/gold-bar.svg" />
            <List.Content>
              <List.Header>
                {props.userPlayer === 'player1' ? props.playerTwoResources.gold + ' gold' : props.playerOneResources.gold + ' gold'}
              </List.Header>
            </List.Content>
          </List.Item>
          <List.Item>
            <Image height="100px" style={{marginBottom: '-50px'}} src="./images/wood-pile.svg" />
            <List.Content>
              <List.Header>
                {props.userPlayer === 'player1' ? props.playerTwoResources.wood + ' wood' : props.playerOneResources.wood + ' wood'}
              </List.Header>
            </List.Content>
          </List.Item>
          <List.Item>
            <Image height="100px" style={{marginBottom: '-30px'}} src="./images/metal-bar.svg" />
            <List.Content>
              <List.Header>
                {props.userPlayer === 'player1' ? props.playerTwoResources.metal + ' metal' : props.playerOneResources.metal + ' metal'}
              </List.Header>
            </List.Content>
          </List.Item>
          <List.Item>
            <Image src="./images/sword.png" />
            <List.Content>
              <List.Header>
                {props.userPlayer === 'player1' ? props.playerTwoUnitBank.swordsmen + ' swordsmen' : props.playerOneUnitBank.swordsmen + ' swordsmen'}
              </List.Header>
            </List.Content>
          </List.Item>
          <List.Item>
            <Image src="./images/archer.png" />
            <List.Content>
              <List.Header>
                {props.userPlayer === 'player1' ? props.playerTwoUnitBank.archers + ' archers' : props.playerOneUnitBank.archers + ' archers'}
              </List.Header>
            </List.Content>
          </List.Item>
          <List.Item>
            <Image src="./images/knight.png" />
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
