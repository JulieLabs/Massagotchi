import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnvVariable } from './utils';
import {
  Args,
  fromMAS,
  CHAIN_ID,
  ClientFactory,
  DefaultProviderUrls,
  WalletClient
} from '@massalabs/massa-web3';
import { readFileSync } from 'fs';

// Obtain the current file name and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

// Load .env file content into process.env
dotenv.config();

// Get environment variables
const secretKey = getEnvVariable('WALLET_SECRET_KEY_2');
// Define deployment parameters
const chainId = CHAIN_ID.MainNet; // Choose the chain ID corresponding to the network you want to deploy to

// Create an account using the private keyc
const senderAccount = await WalletClient.getAccountFromSecretKey(secretKey);

const client = await ClientFactory.createDefaultClient(DefaultProviderUrls.MAINNET, chainId, false, senderAccount);
const opId = client.smartContracts().deploySmartContract({
    contractDataBinary: readFileSync(path.join(__dirname, 'build', 'transferCoins.wasm')),
    fee: BigInt(0),
    maxGas: BigInt(100000000),
    maxCoins: BigInt(fromMAS(1)),
});
console.log(opId);
