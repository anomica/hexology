FROM node:carbon

# Create app directory
WORKDIR /auth

COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

EXPOSE 8000:8000

CMD npm start 