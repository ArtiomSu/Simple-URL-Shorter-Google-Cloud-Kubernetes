FROM node:alpine

WORKDIR /url

ENV PORT=8080

ADD bin/* ./bin/
ADD *.js ./
ADD package.json .

EXPOSE 8080

RUN npm install
CMD npm start