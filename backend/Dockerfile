FROM node:16

# Install dependencies and build the project
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Run the Hardhat tests and expose Hardhat's JSON-RPC
CMD ["npx", "hardhat", "node"]
