FROM node:carbon

# Create app directory
WORKDIR /users/src/app

COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

EXPOSE 3000:3000

CMD npm start && webpack