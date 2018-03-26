import React from 'react';
import { connect } from 'react-redux';
import { Button, Header, Image, Modal, Icon, Form, Checkbox } from 'semantic-ui-react';
import { toggleLoginSignup } from '../../src/actions/actions.js';
import { bindActionCreators } from 'redux';
import { toggleLoginSignup } from '../../src/actions/actions.js';

class Login extends React.Component {
  return (
    <Modal open={props.showLogin} closeIcon>
      <Modal.Header>Login</Modal.Header>
      <Modal.Content>
        <Modal.Description>
        <Form>
          <Form.Input
            label='Username'
            type='text'
            onChange={(e) => console.log(e.target.value)}
          />
          <Form.Input label='Password' type='password' />
          <Button
            onClick={() => {console.log('submit button clicked: ', `input[type='text']`)}}
            type='submit'
          >Submit</Button>
        </Form>
        </Modal.Description>
      </Modal.Content>
    </Modal>
  )
}

const mapStateToProps = (state) => {
  return {
    showLogin: state.state.showLogin
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ toggleLoginSignup }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);
