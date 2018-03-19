import React from 'react';
import { connect } from 'react-redux';
import { Button, Header, Popup, Image, Modal, Content, Description, Icon, Form, Checkbox, Label } from 'semantic-ui-react';

class UnitShop extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false
    }
  }

  show() {
    this.setState({ open: true });
  }
  close() {
    this.setState({ open: false });
  }

  render() {
    return (
      <div>
        <Popup trigger={<Button onClick={() => this.show('blurring')}>Unit Store</Button>}>
          <Popup.Header>Spend your resources on new units!</Popup.Header>
        </Popup>

        <Modal open={this.state.open} className={'unitShop'} size={'mini'}
          style={{textAlign: 'center'}} closeIcon onClose={this.close.bind(this)}>
          <Modal.Header>Unit Shop</Modal.Header>
          <Modal.Content>
            <Modal.Description>
              <Label color='blue' image className={'unitType'}>
                <img src="https://png.icons8.com/metro/50/000000/sword.png"/>
                Swordsmen
                <Label.Detail>Cost: 10 gold, 10 metal</Label.Detail>
              </Label>
              <Label color='green' image className={'unitType'}>
                <img src="https://png.icons8.com/windows/50/000000/archer.png"/>
                Archer
                <Label.Detail>Cost: 10 gold, 20 wood</Label.Detail>
              </Label>
              <Label color='grey' image className={'unitType'}>
                <img src="https://png.icons8.com/ios/50/000000/knight-shield-filled.png"/>
                Knight
                <Label.Detail>Cost: 30 gold, 20 metal</Label.Detail>
              </Label>
            </Modal.Description>
          </Modal.Content>
        </Modal>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {

  }
}

const mapDispatchToProps = (dispatch) => {
  return {

  }
}

export default connect(mapStateToProps, mapDispatchToProps)(UnitShop);
