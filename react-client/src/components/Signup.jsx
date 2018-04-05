import React from 'react';
import axios from 'axios';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { setPlayerOne, setPlayerTwo } from '../../src/actions/actions.js';
import { Button, Header, Image, Modal, Icon, Form, Checkbox, Message, Transition } from 'semantic-ui-react';
import { withRouter } from 'react-router';
import { toggleLoginSignup, login } from '../../src/actions/actions.js';


class Signup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      email: '',
      buttonMessage: 'Submit',
      error: false,
      invalidUsername: false,
      invalidEmail: false
    }
    this.isValid = this.isValid.bind(this);
    this.validateEmail = this.validateEmail.bind(this)
  }

  isValid(input) {
    return !/[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g.test(input);
  }

  validateEmail(email) {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
  }

  signup() {
    if ( this.isValid(this.state.username) && this.validateEmail(this.state.email) ) {
      axios.post('/signup', {
        username: this.state.username,
        email: this.state.email,
        password: this.state.password
      })
      .then(data => {
        let context = this;
        this.setState({ buttonMessage: `Success! Welcome, ${data.data[0].username}!` })
        setTimeout(() => {
          this.handleClose();
          this.props.login(data.data[0].username);
        }, 2500);
      })
      .catch(err => {
        this.setState({
          buttonMessage: 'That username/email is taken',
          error: true,
          invalidEmail: true,
          invalidUsername: true
        })
        console.log('error from signup:', err);
        setTimeout(() => {
          this.setState({
            error: false,
            buttonMessage: 'Submit',
          });
        }, 3500);
      })
    } else {
      if (!this.isValid(this.state.username) && !this.validateEmail(this.state.email)) {
        this.setState({
          buttonMessage: 'Invalid username/email',
          error: true,
          invalidUsername: true,
          invalidEmail: true
        });
      } else if (!this.isValid(this.state.username)) {
        this.setState({
          buttonMessage: 'Invalid username',
          error: true,
          invalidUsername: true
        });
      } else if (!this.validateEmail(this.state.email)) {
        this.setState({
          buttonMessage: 'Invalid email',
          error: true,
          invalidEmail: true
        });
      }
      setTimeout(() => {
        this.setState({
          error: false,
          buttonMessage: 'Submit'
        });
      }, 3500);
    }
  }

  handleChange(e, name) {
    this.setState({
      [name]: e.target.value
    }, () => {
      this.setState({
        invalidUsername: false,
        invalidEmail: false
      })
    })
  }

  handleClose() {
    this.props.toggleLoginSignup('signup');
    this.setState({
      invalidUsername: false,
      invalidEmail: false
    });
  }

  render() {
    return (
      <Transition animation={'pulse'} duration={5000} visible={true}>
        <Modal open={this.props.showSignup} closeIcon onClose={this.handleClose.bind(this)}>
          <Modal.Header>Sign Up</Modal.Header>
          <Modal.Content>
            <Modal.Description>
            <Form>
              <Form.Input
                name='username'
                required
                onChange={(e) => {this.handleChange(e, 'username')}}
                label='Username'
                type='text'
                error={this.state.invalidUsername}
              />
              <Form.Input
                name='password'
                required
                onChange={(e) => {this.handleChange(e, 'password')}}
                label='Password'
                type='password' />
              <Form.Input
                name='email'
                onChange={(e) => {this.handleChange(e, 'email')}}
                label='Email'
                required
                error={this.state.invalidEmail}
                type='email' />
              <Transition animation={'jiggle'} duration={'1000'} visible={true}>
                <Button
                  onClick={this.signup.bind(this)}
                  type='submit'
                  style={{
                    backgroundColor: this.state.error ? 'red' : 'green',
                    color: 'white',
                    float: 'right',
                    marginBottom: '10px'
                  }}
                  >{this.state.buttonMessage}</Button>
                </Transition>
            </Form>
            </Modal.Description>
          </Modal.Content>
        </Modal>
      </Transition>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    showSignup: state.state.showSignup,
    loggedInUser: state.state.loggedInUser
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ toggleLoginSignup, login }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Signup);