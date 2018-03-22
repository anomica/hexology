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
          <li>Players take turns purchasing units adn moving around the board.</li>
          <li>Your hexes are filled in blue; your opponent's are red.</li>
          <li>If you begin a turn on a resource hex, marked with yellow for gold, green for wood, and grey for metal, you will consume that resource and your reserve will tick up by 10.</li>
          <li>On your turn, you will see a grey "Unit Store" button. Click this and then click a unit type. If you have enough resources, you will get more units!</li>
          <li>To move, click on your hex. You will see all possible moves in green. Click on one of them to move.</li>
          <li>When you encounter an opponent, the computer will roll some dice, add modifiers for unit quantity, and inform you of the winner!</li>
          <li>Swordsmen will add one to your roll per individual unit, archers will add two, and knights will add three.</li>
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
