import React from 'react';
import { connect } from 'react-redux';
import { Button, Header, Image, Modal, Icon } from 'semantic-ui-react';

class LoadGame extends React.Component {
  constructor(props) {
    super(props);
    this.state = {

    }
  }

  render() {
    return (
      <Modal open={this.props.open} onClose={this.props.close} closeIcon>
        <Modal.Header>Games</Modal.Header>
        <Modal.Content>
          <Modal.Description>
          <ol>
            <li>Game 1</li>
            <li>Game 2</li>
            <li>Game 3</li>
          </ol>
          </Modal.Description>
        </Modal.Content>
      </Modal>
    )
  }
}

const mapStateToProps = (state) => {
  return {

  }
}

export default connect(mapStateToProps, null)(LoadGame);