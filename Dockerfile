FROM mhart/alpine-node:6

COPY package.json .
RUN npm install

COPY *.js ./

CMD node index.js
