#source: https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
FROM arm64v8/node:alpine
WORKDIR /opt/auckland-libraries/src/
COPY . .
RUN apk update && apk add build-base && apk add python && apk add py-pip && apk add curl-dev && apk add py-curl
RUN pip install mechanize
RUN npm install
CMD [ "node", "server.js" ]
