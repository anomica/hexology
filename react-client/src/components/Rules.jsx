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
          <li>Players take turns moving around the board.</li>
          <li>Your hexes are filled in blue; your opponent's are red.</li>
          <li>To move, click on your hex. You will see all possible moves in green. Click on one of them to move.</li>
          <li>If you begin a turn on a resource hex, marked with yellow, you will consume that resource and get 10 units.</li>
          <li>When you encounter an opponent, the computer will roll some dice, add modifiers for unit quantity, and inform you of the winner!</li>
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
