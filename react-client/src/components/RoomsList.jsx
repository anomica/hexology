import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Segment, Image, Feed, Label, Button } from 'semantic-ui-react';

const RoomsList = props => {
  if (props.rooms) {
    return (
      <Feed style={{textAlign: 'center', width: '45%', marginLeft: '20%', marginTop: 0, paddingTop: '20px'}}>
        <h1>Welcome to Hexology</h1>
        <h3>Currently Open Rooms: </h3>
        {Object.keys(props.rooms).map((room, id) => {
          room = props.rooms[room];
          return (
            <Feed key={id}>
              <Feed.Content>
                <Feed.Label>New Game</Feed.Label>
                <Feed.Meta>Players: {room.length}/2</Feed.Meta>
              </Feed.Content>
              {room.length === 1 ?
                <Button color="green">Join Game</Button> :
                <Button color="red" disabled>Game Full</Button>
              }
            </Feed>
          )
        })}
      </Feed>
    )
  } else {
    return <Segment>No available games. Start your own!</Segment>;
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
