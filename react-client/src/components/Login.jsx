import React from 'react';
import { connect } from 'react-redux';
import axios from 'axios';
import { Button, Header, Image, Modal, Icon, Form, Checkbox } from 'semantic-ui-react';
import { bindActionCreators } from 'redux';
import { toggleLoginSignup, login } from '../../src/actions/actions.js';

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: ''
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
        this.props.login(data.data.username);
        this.handleClose();
      })
      .catch(err => {
        alert('Username already exists');
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
            <Button
              onClick={this.handleSubmit.bind(this)}
              type='submit'
            >Submit</Button>
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
