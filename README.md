# Blockchain Voting System

A decentralized voting system built on Ethereum blockchain.

## Features

- Smart contract based voting system on Ethereum
- Admin can add candidates and register voters
- Secure and transparent vote casting
- Real-time vote counting
- MetaMask integration for Ethereum wallet connectivity
- Responsive web interface

## Requirements

- Node.js and npm
- MetaMask browser extension
- Access to Ethereum Sepolia testnet
- Some Sepolia ETH (free from faucets)

## Setup Instructions

### 1. Clone the repository

```
git clone <repository-url>
cd voting-blockchain
```

### 2. Install dependencies

```
# Install the root project dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Configure environment variables

Create a `.env` file in the root directory with your API keys:

```
# Copy the example .env file
cp .env.example .env

# Then edit .env with your own values
```

Fill in the following values in your `.env` file:

- `INFURA_API_KEY`: Your Infura project API key (sign up at infura.io)
- `PRIVATE_KEY`: Your MetaMask wallet private key (without 0x prefix)
- `ETHERSCAN_API_KEY`: (Optional) Your Etherscan API key for contract verification

> ⚠️ IMPORTANT: Never commit your `.env` file to Git. The `.gitignore` file should already exclude it.

### 4. Deploy the smart contract

```
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

After deployment, note the contract address that's displayed in the console.

### 5. Configure the frontend

Edit `frontend/src/App.js` to update the contract address:

```javascript
const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS"; // Update with your contract address
```

### 6. Start the frontend application

```
cd frontend
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## How to Use

### Admin Functions

The account that deployed the contract becomes the admin. With the admin account:

1. Add candidates before starting the voting period
2. Register voter addresses
3. Start the voting period with a specified duration
4. End the voting period

### Voter Functions

Users with registered addresses can:

1. Connect their MetaMask wallet
2. View the list of candidates
3. Cast their vote (only once)
4. View real-time voting results

## Getting Sepolia Testnet ETH

You can get free Sepolia ETH from these faucets:
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)

## Technical Details

- The smart contract is written in Solidity 0.8.0
- Frontend is built with React
- Contract interaction is handled via ethers.js
- MetaMask is used for wallet connectivity

## License

MIT 