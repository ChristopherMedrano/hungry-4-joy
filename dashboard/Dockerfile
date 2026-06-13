FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY bin/render-dashboard-start.sh /usr/local/bin/render-dashboard-start

RUN chmod +x /usr/local/bin/render-dashboard-start

EXPOSE 8080

ENTRYPOINT []
CMD ["render-dashboard-start"]
