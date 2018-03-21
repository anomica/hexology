import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Route, Switch, withRouter, browserHistory } from 'react-router-dom';
import $ from 'jquery';

import Board from './Board.jsx';
import Login from './Login.jsx';
import Signup from './Signup.jsx';
import SidebarLeft from './Sidebar.jsx';
import Main from './Main.jsx';

class App extends React.Component {
  constructor(props) {
    super(props)
  }

  // App component handles all redirections based on path options below
  // switch first route to Profile to see profile
  render() {
    return (

      <Router history={browserHistory}>
        <Switch>
          <Route exact path='/' component={ Main } />
          <Route path='/game' component={ Board } />
          <Route path='/login' component={ Login } />
          <Route path='/signup' component={ Signup } />
        </Switch>
      </Router>
    )
  }
}

export default App;
