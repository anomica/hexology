const config = require('./config.js');
const mysql = require('mysql');

const knex = require('knex')({
  client: 'mysql',
  connection: config.mySql
});



module.exports = {

}