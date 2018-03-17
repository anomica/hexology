import React from 'react';
import { connect } from 'react-redux';
import { Button, Header, Image, Modal, Icon, Form, Checkbox } from 'semantic-ui-react';

const Signup = props => {
  return (
    <Modal defaultOpen={true} closeIcon>
      <Modal.Header>Signup</Modal.Header>
      <Modal.Content>
        <Modal.Description>
        <Form>
          <Form.Input label='Username' type='text' />
          <Form.Input label='Password' type='password' />
          <Button type='submit'>Submit</Button>
        </Form>
        </Modal.Description>
      </Modal.Content>
    </Modal>
  )
}

const mapStateToProps = (state) => {
  return {

  }
}

export default connect(mapStateToProps, null)(Signup);
