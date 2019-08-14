FROM node:carbon-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn
COPY ./src ./src
RUN yarn build
RUN yarn --production
COPY . .

FROM pandoc/core
WORKDIR /app
RUN apk add --update --no-cache nodejs
COPY --from=builder /app /app
RUN ln -s /app/docker-entrypoint.sh /usr/local/bin/

ENV HOSTNAME=0.0.0.0
ENV PORT=4000
EXPOSE 4000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pandoc-api"]
