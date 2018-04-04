import React from 'react';
import { connect } from 'react-redux';
import { List, Image } from 'semantic-ui-react';


const userPlayerBank = (props) => {
  const styles = {
    list: {
      marginLeft: '10px',
      marginRight: '10px'
    }
  }
  return (
    <div>
      <List horizontal style={styles.list}>
        <List.Item>
          <List horizontal>
            <List.Item >
              <Image height="100px" style={{marginTop: '50px'}} src="./images/gold-bar.svg" />
              <List.Content>
                <List.Header>Gold: {props.userPlayer === 'player1' || props.spectator ? props.playerOneResources.gold :
                  props.playerTwoResources.gold}
                </List.Header>
              </List.Content>
            </List.Item>
            <List.Item >
              <Image height="100px" style={{marginTop: '50px'}} src="./images/wood-pile.svg" />
              <List.Content>
                <List.Header>Wood: {props.userPlayer === 'player1' || props.spectator ? props.playerOneResources.wood :
                  props.playerTwoResources.wood}
                </List.Header>
              </List.Content>
            </List.Item>
            <List.Item>
              <Image height="100px" style={{marginTop: '50px'}} src="./images/metal-bar.svg" />
              <List.Content>
                <List.Header>Metal: {props.userPlayer === 'player1' || props.spectator ? props.playerOneResources.metal :
                  props.playerTwoResources.metal}
                </List.Header>
              </List.Content>
            </List.Item>
          </List>
          </List.Item>
          <List.Item>
          <List horizontal>
            <List.Item>
              <Image src="./images/sword.png" />
              <List.Content>
                <List.Header>Swordsmen: {props.userPlayer === 'player1' || props.spectator ? props.playerOneUnitBank.swordsmen :
                  props.playerTwoUnitBank.swordsmen}
                </List.Header>
              </List.Content>
            </List.Item>
            <List.Item>
              <Image src="./images/knight.png" />
              <List.Content>
                <List.Header>Knights: {props.userPlayer === 'player1' || props.spectator ? props.playerOneUnitBank.knights :
                  props.playerTwoUnitBank.knights}
                </List.Header>
              </List.Content>
            </List.Item>
            <List.Item>
              <Image src="./images/archer.png" />
              <List.Content>
                <List.Header>Archers: {props.userPlayer === 'player1' || props.spectator ? props.playerOneUnitBank.archers :
                  props.playerTwoUnitBank.archers}
                </List.Header>
              </List.Content>
            </List.Item>
          </List>
        </List.Item>
      </List>
    </div>
  )
}

const mapStateToProps = (state) => {
  return {
    userPlayer: state.state.userPlayer,
    playerOneUnitBank: state.state.playerOneUnitBank,
    playerTwoUnitBank: state.state.playerTwoUnitBank,
    playerOneResources: state.state.playerOneResources,
    playerTwoResources: state.state.playerTwoResources,
    spectator: state.state.spectator
  }
}

export default connect(mapStateToProps, null)(userPlayerBank);
