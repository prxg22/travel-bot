FROM mhart/alpine-node:6

COPY package.json .

RUN npm install
RUN mkdir ./data/
RUN touch ./data/travels.json

COPY *.js ./

CMD node index.js
