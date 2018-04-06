import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware } from 'redux';
import { Router, Route } from 'react-router-dom';
import { syncHistoryWithStore, routerReducer } from 'react-router-redux';
import App from './App.jsx';
import reducers from '../reducers/reducers.js';
import { store, history } from '../store/index.js';

/* Root component can only have one child component (App).
App component handles route redirection based on the filtered path option below */
const Root = () => (
  <Provider store={ store }>
    <Router history={ history }>
      <Route path='/:filter?' component={App} />
    </Router>
  </Provider>
)

export default Root;
