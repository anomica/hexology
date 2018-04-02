DROP DATABASE IF EXISTS hexology;
CREATE DATABASE hexology;
USE hexology;


DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(60) NOT NULL,
  email VARCHAR(250) NOT NULL,
  password VARCHAR(250) NOT NULL,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  PRIMARY KEY (user_id)
);


DROP TABLE IF EXISTS games;

CREATE TABLE games (
  game_id INT NOT NULL AUTO_INCREMENT,
  game_index VARCHAR(60) NOT NULL,
  room_id INT NOT NULL,
  p1_total_units INT DEFAULT 10, 
  p2_total_units INT DEFAULT 10, 
  player1 INT NOT NULL,
  p1_gold INT DEFAULT 10,
  p1_wood INT DEFAULT 10,
  p1_metal INT DEFAULT 10,
  p1_swordsmen_bank INT DEFAULT 0, 
  p1_archers_bank INT DEFAULT 0, 
  p1_knights_bank INT DEFAULT 0,
  player2 INT NOT NULL,
  p2_gold INT DEFAULT 10,
  p2_wood INT DEFAULT 10,
  p2_metal INT DEFAULT 10,
  p2_swordsmen_bank INT DEFAULT 0,
  p2_archers_bank INT DEFAULT 0,
  p2_knights_bank INT DEFAULT 0,
  current_player INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  game_completed BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (game_id),
  FOREIGN KEY (player1) REFERENCES users (user_id),
  FOREIGN KEY (player2) REFERENCES users (user_id)
);


DROP TABLE IF EXISTS hex;

CREATE TABLE hex (
  hex_id INT NOT NULL AUTO_INCREMENT,
  hex_index VARCHAR(60) NOT NULL,
  game_id INT NOT NULL,
  coordinate_0 INT NOT NULL,
  coordinate_1 INT NOT NULL,
  coordinate_2 INT NOT NULL,
  player INT DEFAULT NULL,
  hex_owner INT DEFAULT NULL,
  has_gold BOOLEAN DEFAULT FALSE,
  has_wood BOOLEAN DEFAULT FALSE,
  has_metal BOOLEAN DEFAULT FALSE,
  swordsmen INT DEFAULT 0,
  archers INT DEFAULT 0,
  knights INT DEFAULT 0,
  remove_hex BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (hex_id),
  FOREIGN KEY (game_id) REFERENCES games (game_id),
  FOREIGN KEY (player) REFERENCES users (user_id)
);

INSERT INTO users (username, email, password)
VALUES
('anonymous', '$2a$10$MHRAAxfcRiwToSSUOUD3wupECrfeq2SwWXouBqrh8SGV7AR/KK28G@anonymous.com', '$2a$10$MHRAAxfcRiwToSSUOUD3wupECrfeq2SwWXouBqrh8SGV7AR/KK28G'),

('anonymous', '$2a$10$MHRAAxfcRiwToSSUOUD3wupECrfeq2SwWXouBqrh8SGV7AR/KK28G@anonymous.com', '$2a$10$MHRAAxfcRiwToSSUOUD3wupECrfeq2SwWXouBqrh8SGV7AR/KK28G');

-- mysql -u root < schemamysql.sql
