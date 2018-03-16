import React from 'react';
import { connect } from 'react-redux';
import { Button, Header, Image, Modal } from 'semantic-ui-react';

const Rules = (props) => {
  console.log(props)
  return (
    <Modal defaultOpen={true}>
      <Modal.Header>Rules</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <ol>
            <li> Rule</li>
            <li> Rule</li>
            <li> Rule
              <ol>
                <li> Rule</li>
                <li> Rule</li>
                <li> Rule</li>
              </ol>
            </li>
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
