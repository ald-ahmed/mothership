FROM node:14 AS ui-build
WORKDIR /usr/src/app
COPY client/ ./client/
RUN cd client && npm install && npm run build

FROM node:14 AS server-build
WORKDIR /root/
COPY --from=ui-build /usr/src/app/client/build ./client/build
COPY backend/package*.json ./api/
RUN cd api && npm install
COPY backend/ ./api/

EXPOSE 3001
EXPOSE 1818

CMD ["node", "./api/app.js"]


# copy client into /usr/src/app/client
# go into /usr/src/app/client and run npm install, npm build
# copy /usr/src/app/client/build into /root/client/build
# copy backend/package*.json into /root/api/
# go into api and npm install

