FROM library/node:alpine

COPY *.js package*.json tsconfig.json /app/
COPY src/                             /app/src/
COPY www/                             /app/www/

WORKDIR /app

RUN npm ci && \
    npm run build

CMD [ "npm", "start" ]

VOLUME /app/data

EXPOSE 3000
