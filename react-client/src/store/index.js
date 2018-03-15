import React from 'react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { Router, Route } from 'react-router-dom';
import { syncHistoryWithStore, routerReducer } from 'react-router-redux';
import { createBrowserHistory } from 'history';
import reducers from '../../src/reducers/reducers.js';

const reducer = combineReducers({
  data: reducers
});

export const store = createStore(
  combineReducers({
    ...reducers,
    routing: routerReducer
  }),
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

export const history = syncHistoryWithStore(createBrowserHistory(), store);
