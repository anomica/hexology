import React from 'react';
import axios from 'axios';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { setPlayerOne, setPlayerTwo } from '../../src/actions/actions.js';
import { Button, Header, Image, Modal, Icon, Form, Checkbox } from 'semantic-ui-react';
import { withRouter } from 'react-router';

class Signup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      email: '',
      userId: ''
    }
  }

  signup(username, password, email) {
    axios.post('/signup', {
      username: this.state.username,
      email: this.state.email,
      password: this.state.password
    })
    .then(async user => {
      // console.log(user)
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

  render() {
    return (
      <Modal defaultOpen={true} closeIcon>
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
    socket: state.state.socket.id
  }
}

export default connect(mapStateToProps, null)(withRouter(Signup));
