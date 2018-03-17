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
          <li> Rule</li>
          <li> Rule</li>
          <li> Rule</li>
          <li> Rule</li>
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