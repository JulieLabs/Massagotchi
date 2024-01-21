import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnvVariable } from './utils';
import { WalletClient } from '@massalabs/massa-sc-deployer';
import {
  Args,
  fromMAS,
  CHAIN_ID,
  ClientFactory,
  DefaultProviderUrls,
} from '@massalabs/massa-web3';

// Obtain the current file name and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

// Load .env file content into process.env
dotenv.config();

// Get environment variables
const secretKey = getEnvVariable('WALLET_SECRET_KEY');
const publicApi = getEnvVariable('JSON_RPC_URL_PUBLIC');

// Define deployment parameters
const chainId = CHAIN_ID.MainNet; // Choose the chain ID corresponding to the network you want to deploy to

// Create an account using the private keyc
const deployerAccount = await WalletClient.getAccountFromSecretKey(secretKey);

const client = await ClientFactory.createDefaultClient(DefaultProviderUrls.TESTNET, chainId, false, deployerAccount);

const args = new Args().addString(deployerAccount.address!).addU64(fromMAS(7.2));
const opId = await client.smartContracts().callSmartContract({
    targetAddress: "AS1BaBzUBkT3uTcf79NZyPtUfpRESXhgnxA9N5hg2wY25UCLCXMz",
    functionName: "transferInternalCoins",
    parameter: args.serialize(),
    coins: BigInt(0),
    fee: BigInt(0),
    maxGas: BigInt(100000000)
});
console.log(opId);