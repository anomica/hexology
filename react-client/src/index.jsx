import React from 'react'
import { render } from 'react-dom'
import Root from './components/Root.jsx'
import store from './store/index.js';

render (
  <Root store={store} />,
  document.getElementById('mount')
)
