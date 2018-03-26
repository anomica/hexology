import React from 'react';
import axios from 'axios';
import { connect } from 'react-redux';
import { Button, Header, Image, Modal, Icon, Form, Checkbox } from 'semantic-ui-react';
import { withRouter } from 'react-router';
import { bindActionCreators } from 'redux';
import { toggleLoginSignup } from '../../src/actions/actions.js';


class Signup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      email: ''
    }
  }

  signup(username, password, email) {
    axios.post('/signup', {
      username: this.state.username,
      email: this.state.email,
      password: this.state.password
    })
    .then(data => {
      console.log('data from signup:', data);
      this.handleClose();
    })
    .catch(err => {
      alert('Username already exists');
      console.log('error from signup:', err);
    })
  }

  handleChange(e, name) {
    this.setState({
      [name]: e.target.value
    }, () => {
      // console.log(`this.state[${[name]}]`, this.state[name])
    })
  }
  
  handleClose() {
    this.props.toggleLoginSignup('signup');
  }

  render() {
    return (
      <Modal open={this.props.showSignup} closeIcon onClose={this.handleClose.bind(this)}>
        <Modal.Header>Signup</Modal.Header>
        <Modal.Content>
          <Modal.Description>
          <Form>
            <Form.Input
              name='username'
              onChange={(e) => {this.handleChange(e, 'username')}}
              label='Username'
              type='text' />
            <Form.Input
              name='password'
              onChange={(e) => {this.handleChange(e, 'password')}}
              label='Password'
              type='password' />
            <Form.Input
              name='email'
              onChange={(e) => {this.handleChange(e, 'email')}}
              label='Email'
              type='email' />
            <Button
              onClick={this.signup.bind(this)}
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
    showSignup: state.state.showSignup
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ toggleLoginSignup }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Signup);
