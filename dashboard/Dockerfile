FROM node:20-alpine AS build
WORKDIR /app

# Copy package files and install cleanly
COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

# Capture the ARG from docker-compose and set it as an ENV for the Vite build
ARG VITE_API_URL="http://localhost:8000"
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Requires nginx.conf for React Router to work (provided below)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]