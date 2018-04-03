import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Modal, Icon } from 'semantic-ui-react';
import { warningOpen, forfeitOpen } from '../../src/actions/actions.js';

const TimeoutModals = (props) => {
  if (props.warningOpen !== undefined && props.forfeitOpen !== undefined) {
    return (
      <div>
        <Modal open={props.warningModalOpen} onClose={() => props.warningOpen(false)} closeIcon>
          <Modal.Content>
            <Modal.Description>
              You have 30 seconds to finish your move
            </Modal.Description>
          </Modal.Content>
        </Modal>
        <Modal open={props.forfeitModalOpen} onClose={() => props.forfeitOpen(false)} closeIcon>
          <Modal.Content>
            <Modal.Description>
              {props.currentPlayer + ' '} took to long to make a move and forfeits the turn
            </Modal.Description>
          </Modal.Content>
        </Modal>
      </div>
    )
  } else {
    return <div></div>
  }
}

const mapStateToProps = (state) => {
  return {
    warningModalOpen: state.state.warningModalOpen,
    forfeitModalOpen: state.state.forfeitModalOpen,
    currentPlayer: state.state.currentPlayer
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ warningOpen, forfeitOpen }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(TimeoutModals);
