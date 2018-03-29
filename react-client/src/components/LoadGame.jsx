import React from 'react';
import { connect } from 'react-redux';
import axios from 'axios';
import { Button, Header, Image, Modal, Icon } from 'semantic-ui-react';

class LoadGame extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      games: []
    }
    this.getUserGames = this.getUserGames.bind(this);
  }

  getUserGames() {
    axios.post('/usergames', {
      username: this.props.username
    })
    .then(games => {
      this.setState({
        games: games.data
      })
    })
    .catch(err => console.err('error in getting user games: ', err));
  }

  componentDidMount() {
    this.getUserGames();
  }

  render() {
    return (
      <Modal open={this.props.open} onClose={this.props.close} closeIcon>
        <Modal.Header>My Current Games</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            {this.state.games.length
              ? <ol>
                  {this.state.games.map( (game, i) =>
                    <li key={i} onClick={() => console.log('helllooooooo')}>{game.game_id}</li>
                  )}
                </ol>
              : <div>You currently have no existing games!</div>
            }
          </Modal.Description>
        </Modal.Content>
      </Modal>
    )
  }
}

const mapStateToProps = (state) => {
  return {

  }
}

export default connect(mapStateToProps, null)(LoadGame);