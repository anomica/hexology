DROP DATABASE IF EXISTS hexology;
CREATE DATABASE hexology;
USE hexology;

-- User table
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id serial PRIMARY KEY,
  username VARCHAR(60) NOT NULL,
  email VARCHAR(60) NOT NULL,
  password varchar(60) NOT NULL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0
);

-- Games table
DROP TABLE IF EXISTS games;

CREATE TABLE games (
  game_id serial PRIMARY KEY,
  room_id INTEGER NOT NULL,
  player1 INTEGER REFERENCES users (user_id) NOT NULL,
  player2 INTEGER REFERENCES users (user_id) NOT NULL,
  current_player INTEGER DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  game_completed BOOLEAN DEFAULT FALSE
);

-- Hex table
DROP TABLE IF EXISTS hex;

CREATE TABLE hex (
  hex_id serial PRIMARY KEY,
  game_id INTEGER REFERENCES games (game_id) NOT NULL,
  player INTEGER REFERENCES users (user_id) NOT NULL DEFAULT NULL,
  units INTEGER NOT NULL,
  has_resource BOOLEAN DEFAULT FALSE
);

-- mysql -u root < schemamysql.sql
