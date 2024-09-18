# Use an official image as a parent image
FROM node:20-alpine AS builder

# Install dependencies
RUN apk add --no-cache make

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the source code into the container
COPY . .

# Run the make command to build the static website
RUN make

# Use a lightweight Nginx image
FROM nginx:alpine

# Copy the built static website from the builder stage
COPY --from=builder /app /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
