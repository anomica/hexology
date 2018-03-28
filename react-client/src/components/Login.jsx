import React from 'react';
import { connect } from 'react-redux';
import axios from 'axios';
import { Transition, Button, Header, Image, Modal, Icon, Form, Checkbox } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { toggleLoginSignup, login } from '../../src/actions/actions.js';

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      buttonMessage: 'Submit',
      error: false
    }
  }

  handleClose() {
    this.props.toggleLoginSignup('login');
  }

  handleChange(e, name) {
    this.setState({
      [name]: e.target.value
    })
  }

  handleSubmit() {
    axios.post('/login', {
      username: this.state.username,
      password: this.state.password
    })
      .then(data => {
        this.setState({ buttonMessage: 'Success!', error: false });

        setTimeout(() => {
          this.handleClose();
          this.props.login(data.data.username);
        }, 1000);
      })
      .catch(err => {
        this.setState({
          buttonMessage: 'Incorrect password',
          error: true
        })
        setTimeout(() => this.setState({ buttonMessage: 'Submit', error: false }), 1000);
        console.log('error from signup:', err);
      })
  }

  render() {
    return (
      <Modal open={this.props.showLogin} closeIcon onClose={this.handleClose.bind(this)}>
        <Modal.Header>Login</Modal.Header>
        <Modal.Content>
          <Modal.Description>
          <Form>
            <Form.Input
              label='Username'
              type='text'
              onChange={(e) => this.handleChange(e, 'username')}
            />
            <Form.Input
              label='Password'
              type='password'
              onChange={(e) => this.handleChange(e, 'password')}
            />
          <Transition name={'jiggle'} duration={500} display={this.state.error}>
            <Button
              style={{
                backgroundColor: this.state.error ? 'red' : 'green',
                color: 'white',
                float: 'right',
                marginBottom: '10px'
              }}
              onClick={this.handleSubmit.bind(this)}
              type='submit'
            >{this.state.buttonMessage}</Button>
          </Transition>
          </Form>
          </Modal.Description>
        </Modal.Content>
      </Modal>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    showLogin: state.state.showLogin
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ toggleLoginSignup, login }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);
