# Step 1: Use an official Node.js runtime as the base image
# We use the 'alpine' version because it's very small and secure.
# Using a specific version like '22' is better than 'latest' for consistency.
FROM node:22-alpine

# Step 2: Set the working directory inside the container
WORKDIR /app

# Step 3: Copy package.json and package-lock.json first
# This is a key optimization. If these files don't change, Docker
# can reuse the cached dependencies from a previous build, making it much faster.
COPY package*.json ./

# Step 4: Install only the production dependencies
# This keeps the final image smaller and more secure.
RUN npm install --production

# Step 5: Copy the rest of your application code into the container
COPY . .

# Step 6: Tell Docker what command to run when the container starts
# This is the same as your "npm start" script.
CMD ["node", "index.js"]
