import React from 'react';
import { connect } from 'react-redux';

const Login = props => {
  return (
    <h1>Login</h1>
  )
}

const mapStateToProps = (state) => {
  return {

  }
}

export default connect(mapStateToProps, null)(Login);