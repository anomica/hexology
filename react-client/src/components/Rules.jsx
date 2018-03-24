import React from 'react';
import { connect } from 'react-redux';
import { Button, Header, Image, Modal, Icon } from 'semantic-ui-react';

const Rules = (props) => {
  return (
    <Modal open={props.open} onClose={props.close} closeIcon>
      <Modal.Header>Rules</Modal.Header>
      <Modal.Content>
        <Modal.Description>
        <ol>
          <li>Players take turns purchasing units and moving around the board.</li>
          <li>Your hexes are filled in blue; your opponent's are red.</li>
          <li>If you begin a turn on a resource hex, marked with yellow for gold, green for wood, and grey for metal, you will consume that resource and your appropriate reserve will tick up by 10.</li>
          <li>On your turn, you will see a grey "Unit Store" button. Click this and then click a unit type. If you have enough resources, you will get more units!</li>
          <li>To move, click on your hex. You will see all possible moves in green. Click on one of them to move, and then decide whether to move all of your units or leave some behind.</li>
          <li>When you encounter an opponent, your soldiers will fight to the death! Combat works like this:</li>
            <ul>
              <li>Archers have long range, and are powerful against knights. For every archer on the field, <strong>one of the enemy's knights</strong> will die.</li>
              <li>Knights and their horses are swift, well armored, and deadly. For every knight on the field, <strong>three of the enemy's swordsmen</strong> will die.</li>
              <li>Swordsmen are the rank and file of your army, and are proficient with their weapons when they can get close. For every swordsman on the field, <strong>two of the enemy's archers</strong> will die.</li>
            </ul>
          <li>After units have done their specialty damage, the remaining troops will continue to skirmish. Swordsmen will be the first to fall, then archers, and finally, knights.</li>
          <li>If one player loses all their troops, they have lost the battle and their adversary wins the game! The board will reset and you can try again or jump into a different game.</li>
        </ol>
        </Modal.Description>
      </Modal.Content>
    </Modal>
  )
}

const mapStateToProps = (state) => {
  return {

  }
}

export default connect(mapStateToProps, null)(Rules);
