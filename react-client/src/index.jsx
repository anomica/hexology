import React from 'react'
import { render } from 'react-dom'
import Root from './components/Root.jsx'
import store from './store/index.js';
import Favicon from 'react-favicon';

render (
  <div>
    <Favicon url="https://images-na.ssl-images-amazon.com/images/I/51pOcfkRCaL._SL1500_.jpg" />
    <Root store={store} />
  </div>,
  document.getElementById('mount')
)
