import React from 'react';
import { connect } from 'react-redux';
import { Button, Header, Image, Modal, Icon, List, Transition } from 'semantic-ui-react';

const Rules = (props) => {
  return (
    <Transition animation={'pulse'} duration={5000} visible={true}>
    <Modal open={props.open} onClose={props.close} closeIcon>
      <Modal.Header>Rules</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <List as='ol'>
            <List.Item as='li'> Players take turns purchasing units and moving around the board.</List.Item>
            <List.Item as='li'> Your hexes are filled in blue; your opponent's are red.</List.Item>
            <List.Item as='li'> If you begin a turn on a resource hex, you will consume that resource and your appropriate reserve will tick up by 10.</List.Item>
            <List.Item as='li'> On your turn, you will see a grey "Unit Store" button. Click this and then click a unit type. If you have enough resources, you will get more units in your bank!</List.Item>
            <List.Item as='li'> To deploy units from your bank to a hex, click the "deploy troops" button, select a type and quantity, and then click on a hex you own to deploy those units.</List.Item>
            <List.Item as='li'> To move, click on a hex you own. You will see all possible moves in green. Click on one of them to move, and then decide whether to move all of your units or leave some behind.</List.Item>
            <List.Item as='li'> When you encounter an opponent, your soldiers will fight to the death! Combat works like this:
                <List>
                  <List.Item>
                    <Icon name='right triangle' />
                      <List.Content>
                        <List.Description>
                          Archers have long range, and are powerful against knights. For every archer on the field, <strong>one of the enemy's knights</strong> will die.
                        </List.Description>
                      </List.Content>
                  </List.Item>

                  <List.Item>
                    <Icon name='right triangle' />
                      <List.Content>
                        <List.Description>
                          Knights and their horses are swift, well armored, and deadly. For every knight on the field, <strong>three of the enemy's swordsmen</strong> will die.
                        </List.Description>
                      </List.Content>
                  </List.Item>

                  <List.Item>
                    <Icon name='right triangle' />
                      <List.Content>
                        <List.Description>
                          Swordsmen are the rank and file of your army, and are proficient with their weapons when they can get close. For every swordsman on the field, <strong>two of the enemy's archers</strong> will die.
                        </List.Description>
                      </List.Content>
                  </List.Item>
              </List>
              </List.Item>
            <List.Item as='li'> After units have done their specialty damage, the remaining troops will continue to skirmish. Swordsmen will be the first to fall, then archers, and finally, knights.</List.Item>
            <List.Item as='li'> If one player loses all their troops, they have lost the battle and their adversary wins the game! The board will reset and you can try again or jump into a different game.</List.Item>
          </List>
        </Modal.Description>
      </Modal.Content>
    </Modal>
    </Transition>
  )
}

const mapStateToProps = (state) => {
  return {

  }
}

export default connect(mapStateToProps, null)(Rules);
