import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Image, Feed, Label, Button } from 'semantic-ui-react';

const RoomsList = props => {
  if (props.rooms) {
    return (
      <Feed style={{textAlign: 'center', width: '45%', marginLeft: '20%', marginTop: 0, paddingTop: '20px'}}>
        <h1>Welcome to Hexology</h1>
        <h3>Currently Open Rooms: </h3>
        {Object.keys(props.rooms).map((room, id) => {
          room = props.rooms[room];
          console.log(room);
          return (
            <Feed key={id}>
              <Feed.Content>
                <Feed.Label>New Game</Feed.Label>
                <Feed.Meta>Players: {room.length}/2</Feed.Meta>
              </Feed.Content>
              <Button>Join Game</Button>
            </Feed>
          )
        })}
      </Feed>
    )
  } else {
    return null;
  }
}

const mapStateToProps = state => {
  return {
    rooms: state.state.rooms
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({ }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(RoomsList);
