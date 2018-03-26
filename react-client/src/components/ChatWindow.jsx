import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Segment, Confirm, Button, Header, Popup, Image, Modal, Content, Description, Sidebar, Menu, Transition,
         Icon, Form, Checkbox, Divider, Label, Grid, } from 'semantic-ui-react';

class ChatWindow extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false
    }
  }

  render() {
    const styles ={
      chatWindowClosed: {
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '300px'
      },
      chatWindowOpen: {
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '300px',
        height: '600px'
      }
    }
    return (
      <Segment style={this.state.open ? styles.chatWindowClosed : styles.chatWindowClosed}>
        <Header style={{display: 'inline'}}>Chat</Header>
        <Icon className={'chatIcon'} name={this.state.open ? 'compress' : 'expand'}/>
      </Segment>
    )
  }
}

const mapStateToProps = state => {
  return {
    socket: state.state.socket,
    room: state.state.room,
    username: state.state.username
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({ }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ChatWindow);
