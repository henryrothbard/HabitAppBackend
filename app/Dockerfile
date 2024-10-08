FROM node:alpine
ARG PORT=3000

WORKDIR /usr/app

COPY ./package*.json ./

RUN npm install --production

COPY ./src ./src

EXPOSE $PORT

CMD ["npm", "start"]