DROP DATABASE IF EXISTS hexology;
CREATE DATABASE hexology;
USE hexology;

-- User table
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(60) NOT NULL,
  password varchar(60) NOT NULL,
  wins INT DEFAULT NULL,
  losses INT DEFAULT NULL,
  PRIMARY KEY (user_id)
); 

-- Games table
DROP TABLE IF EXISTS games;

CREATE TABLE games (
  game_id INT NOT NULL AUTO_INCREMENT,
  game_index VARCHAR(60) NOT NULL,
  room_id INT NOT NULL,
  player1 INT NOT NULL,
  player2 INT NOT NULL,
  current_player INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id),
  FOREIGN KEY (player1) REFERENCES users (user_id),
  FOREIGN KEY (player2) REFERENCES users (user_id)
); 

-- Hex table
DROP TABLE IF EXISTS hex;

CREATE TABLE hex (
  hex_id INT NOT NULL AUTO_INCREMENT,
  game_id INT NOT NULL,
  player INT NOT NULL,
  units INT NOT NULL,
  has_resource BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (hex_id),
  FOREIGN KEY (game_id) REFERENCES games (game_id)
); 

-- mysql -u root < schemamysql.sql