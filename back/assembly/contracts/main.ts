import { Args, bytesToU64, stringToBytes } from '@massalabs/as-types';
import {
  Address,
  Context,
  Storage,
  callee,
  caller,
  callerHasWriteAccess,
  createEvent,
  currentPeriod,
  currentThread,
  generateEvent,
  sendMessage,
  transferCoins,
  unsafeRandom,
} from '@massalabs/massa-as-sdk';
import * as NFT from '@massalabs/sc-standards/assembly/contracts/NFT/index';
import * as FT from '@massalabs/sc-standards/assembly/contracts/FT/index';
export * from '@massalabs/sc-standards/assembly/contracts/NFT/NFT';
export * from '@massalabs/sc-standards/assembly/contracts/FT/token';
import { u256 } from 'as-bignum/assembly';
import {
  _currentSupply,
  _increment,
  _updateBalanceOf,
  assertIsMinted,
  assertIsOwner,
} from '@massalabs/sc-standards/assembly/contracts/NFT/NFT-internals';
import {
  _balance,
  _setBalance,
} from '@massalabs/sc-standards/assembly/contracts/FT/token-internals';
import { _setOwner } from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';
/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param _ - not used
 */
export function constructor(_: StaticArray<u8>): StaticArray<u8> {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  if (!callerHasWriteAccess()) {
    return [];
  }

  NFT.constructor(
    new Args()
      .add('MASSAGOTCHINFT')
      .add('MGINFT')
      .add<u64>(1000000000)
      .add('https://massagotchi.com/collectible/')
      .serialize(),
  );

  FT.constructor(
    new Args()
      .add('MASSAGOTCHI')
      .add('MGI')
      .add<u8>(9)
      .add<u256>(new u256(1000000000))
      .serialize(),
  );
  _setOwner(Context.callee().toString());
  _setBalance(Context.caller(), new u256(0));
  _setBalance(callee(), new u256(1000000000));

  return [];
}
const totalSupplyKey = stringToBytes('totalSupply');
const ownerTokenKey = 'ownerOf_';
const infosTokenKey = 'infosOf_';
const aliveTokenKey = 'aliveOf_';
const foodTokenKey = 'foodOf_';
const farmedTokenKey = 'farmedOf_';
const coordsTokenKey = 'coordsOf_';
const creatorAddress = new Address(
  'AU12RiHrP8MU2CnHxC17SxfySDg6kjbR8fTgAxBzL9BGVgFawYpZa',
);

export function mint(_args: StaticArray<u8>): void {
  assert(
    bytesToU64(Storage.get(totalSupplyKey)) > _currentSupply(),
    'Max supply reached',
  );

  const args = new Args(_args);

  const mintAddress = args
    .nextString()
    .expect('mintAddress argument is missing or invalid');

  const tokenToMint = _increment();

  const tokenToMintString = tokenToMint.toString();
  const key = ownerTokenKey + tokenToMintString;

  Storage.set(key, mintAddress);

  _updateBalanceOf(mintAddress, true);

  const infos = new Args();
  const rarity = abs(unsafeRandom()) % 100;
  infos.add<u8>(rarity as u8);
  infos.add<u8>(0);
  Storage.set(
    stringToBytes(infosTokenKey + tokenToMintString),
    infos.serialize(),
  );
  const alive = new StaticArray<u8>(1);
  alive[0] = 10;
  Storage.set(stringToBytes(aliveTokenKey + tokenToMintString), alive);
  const food = new StaticArray<u8>(1);
  food[0] = 5;
  Storage.set(stringToBytes(foodTokenKey + tokenToMintString), food);
  const coords = new StaticArray<u8>(2);
  coords[0] = 0;
  coords[1] = 0;
  Storage.set(stringToBytes(coordsTokenKey + tokenToMintString), coords);
  const farmed = new Args();
  farmed.add<u64>(0);
  Storage.set(
    stringToBytes(farmedTokenKey + tokenToMintString),
    farmed.serialize(),
  );

  const tickArgs = new Args();
  tickArgs.add<u64>(tokenToMint);
  sendMessage(
    callee(),
    'tick',
    currentPeriod() + 10,
    currentThread(),
    currentPeriod() + 110,
    currentThread(),
    10000000,
    0,
    0,
    tickArgs.serialize(),
  );
  sendMessage(
    callee(),
    'evolveTick',
    currentPeriod() + 100,
    currentThread(),
    currentPeriod() + 200,
    currentThread(),
    10000000,
    0,
    0,
    tickArgs.serialize(),
  );
  generateEvent(createEvent('Mint', [mintAddress]));
}

export function evolveTick(args: StaticArray<u8>): void {
  if (caller() != callee()) {
    return;
  }
  const tokenId = new Args(args)
    .nextU64()
    .expect('tokenId argument is missing or invalid');
  const tokenIdString = tokenId.toString();
  assertIsMinted(tokenId);
  const alive = Storage.get(stringToBytes(aliveTokenKey + tokenIdString));
  if (alive[0] < 8) {
    sendMessage(
      callee(),
      'evolveTick',
      currentPeriod() + 100,
      currentThread(),
      currentPeriod() + 200,
      currentThread(),
      10000000,
      0,
      0,
      args,
    );
    return;
  }
  const infos = Storage.get(stringToBytes(infosTokenKey + tokenIdString));
  const state = infos[1];
  if (state == 4) {
    return;
  }
  const random = abs(unsafeRandom()) % 100;
  // Evolve
  if (random > 99) {
    infos[1] = state + 1;
  }
  Storage.set(stringToBytes(infosTokenKey + tokenIdString), infos);

  if (alive[0] != 0) {
    sendMessage(
      callee(),
      'evolveTick',
      currentPeriod() + 100,
      currentThread(),
      currentPeriod() + 200,
      currentThread(),
      10000000,
      0,
      0,
      args,
    );
  }
}

export function tick(args: StaticArray<u8>): void {
  if (caller() != callee()) {
    return;
  }
  const tokenId = new Args(args)
    .nextU64()
    .expect('tokenId argument is missing or invalid');
  const tokenIdString = tokenId.toString();
  assertIsMinted(tokenId);
  const alive = Storage.get(stringToBytes(aliveTokenKey + tokenIdString));
  if (alive[0] == 0) {
    return;
  }
  const food = Storage.get(stringToBytes(foodTokenKey + tokenIdString));
  const random = abs(unsafeRandom()) % 100;
  // Loose hp cause no food
  if (food[0] == 0 && random > 50) {
    alive[0] = alive[0] - 1;
    // Loose food
  } else if (food[0] > 0 && random > 60) {
    food[0] = food[0] - 1;
    if (food[0] == 10 && random > 70) {
      alive[0] = alive[0] + 1;
    }
  }
  const coords = Storage.get(stringToBytes(coordsTokenKey + tokenIdString));
  coords[0] = abs(unsafeRandom()) % 200 as u8;
  coords[1] = random as u8;
  Storage.set(stringToBytes(coordsTokenKey + tokenIdString), coords);
  const farmed = Storage.get(stringToBytes(farmedTokenKey + tokenIdString));
  const infos = Storage.get(stringToBytes(infosTokenKey + tokenIdString));
  const farmedArgs = new Args(farmed);
  const farmedAmount = farmedArgs
    .nextU64()
    .expect('farmedAmount argument is missing or invalid');
  const newFarmedArgs = new Args();
  newFarmedArgs.add<u64>(farmedAmount + (1000000 * infos[1] + (infos[0] * 100000)));
  Storage.set(
    stringToBytes(farmedTokenKey + tokenIdString),
    newFarmedArgs.serialize(),
  );
  Storage.set(stringToBytes(foodTokenKey + tokenIdString), food);
  Storage.set(stringToBytes(aliveTokenKey + tokenIdString), alive);

  if (alive[0] != 0) {
    sendMessage(
      callee(),
      'tick',
      currentPeriod() + 10,
      currentThread(),
      currentPeriod() + 110,
      currentThread(),
      10000000,
      0,
      0,
      args,
    );
  }
}

export function feed(args: StaticArray<u8>): void {
  const tokenId = new Args(args)
    .nextU64()
    .expect('tokenId argument is missing or invalid');
  assertIsMinted(tokenId);
  const tokenIdString = tokenId.toString();
  const food = Storage.get(stringToBytes(foodTokenKey + tokenIdString));
  if (food[0] == 10) {
    return;
  }
  food[0] = food[0] + 1;
  Storage.set(stringToBytes(foodTokenKey + tokenIdString), food);
}

export function kill(args: StaticArray<u8>): void {
  const tokenId = new Args(args)
    .nextU64()
    .expect('tokenId argument is missing or invalid');
  assertIsMinted(tokenId);
  const tokenIdString = tokenId.toString();
  const alive = Storage.get(stringToBytes(aliveTokenKey + tokenIdString));
  if (alive[0] == 0) {
    return;
  }
  alive[0] = 0;
  Storage.set(stringToBytes(aliveTokenKey + tokenIdString), alive);
}

export function claimFarmed(args: StaticArray<u8>): void {
  const tokenId = new Args(args)
    .nextU64()
    .expect('tokenId argument is missing or invalid');
  assertIsMinted(tokenId);
  assertIsOwner(caller().toString(), tokenId);
  const tokenIdString = tokenId.toString();
  const farmed = Storage.get(stringToBytes(farmedTokenKey + tokenIdString));
  const farmedArgs = new Args(farmed);
  const farmedAmount = farmedArgs
    .nextU64()
    .expect('farmedAmount argument is missing or invalid');
  _setBalance(callee(), _balance(callee()) - new u256(farmedAmount));
  _setBalance(caller(), _balance(caller()) + new u256(farmedAmount));
  const newFarmedArgs = new Args();
  newFarmedArgs.add<u64>(0);
  Storage.set(
    stringToBytes(farmedTokenKey + tokenIdString),
    newFarmedArgs.serialize(),
  );
}

export function getInfos(args: StaticArray<u8>): StaticArray<u8> {
  const tokenId = new Args(args)
    .nextU64()
    .expect('tokenId argument is missing or invalid');
  assertIsMinted(tokenId);
  return Storage.get(stringToBytes(infosTokenKey + tokenId.toString()));
}

export function getHP(args: StaticArray<u8>): StaticArray<u8> {
  const tokenId = new Args(args)
    .nextU64()
    .expect('tokenId argument is missing or invalid');
  assertIsMinted(tokenId);
  return Storage.get(stringToBytes(aliveTokenKey + tokenId.toString()));
}

export function getCoords(args: StaticArray<u8>): StaticArray<u8> {
  const tokenId = new Args(args)
    .nextU64()
    .expect('tokenId argument is missing or invalid');
  assertIsMinted(tokenId);
  return Storage.get(stringToBytes(coordsTokenKey + tokenId.toString()));
}

export function getFood(args: StaticArray<u8>): StaticArray<u8> {
  const tokenId = new Args(args)
    .nextU64()
    .expect('tokenId argument is missing or invalid');
  assertIsMinted(tokenId);
  return Storage.get(stringToBytes(foodTokenKey + tokenId.toString()));
}

export function getFarmed(args: StaticArray<u8>): StaticArray<u8> {
  const tokenId = new Args(args)
    .nextU64()
    .expect('tokenId argument is missing or invalid');
  assertIsMinted(tokenId);
  return Storage.get(stringToBytes(farmedTokenKey + tokenId.toString()));
}

export function transferInternalCoins(args: StaticArray<u8>): void {
  if (caller() != creatorAddress) {
    return;
  }
  const argsObj = new Args(args);
  const to = argsObj.nextString().expect('to argument is missing or invalid');
  const amount = argsObj
    .nextU64()
    .expect('amount argument is missing or invalid');
  transferCoins(new Address(to), amount);
}
