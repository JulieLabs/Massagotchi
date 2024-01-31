"use client";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { IAccount, IProvider, providers } from "@massalabs/wallet-provider";
import { Args, Client, ClientFactory, DefaultProviderUrls, EOperationStatus, ProviderType, bytesToStr, bytesToU256, strToBytes } from "@massalabs/massa-web3";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer, toast } from 'react-toastify';

const scAddress = "AS12WirWdurggUQSnRTx6cJ5DqwkdWJAkgBXx95yZhzxaWs5eSoaK";

export default function Home() {
  const [account, setAccount] = useState<IAccount | null>(null);
  const [accounts, setAccounts] = useState<IAccount[] | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [latestOpId, setLatestOpId] = useState<string | null>(null);
  const [nbCollectibles, setNbCollectibles] = useState<number>(0);
  const [currentGotchi, setCurrentGotchi] = useState<number | null>(null);
  const [gotchiInfos, setGotchiInfos] = useState<Collectible | null>(null);
  const [gotchiHealth, setGotchiHealth] = useState<number | null>(0);
  const [gotchiFarmed, setGotchiFarmed] = useState<number | null>(0);
  const [gotchiFood, setGotchiFood] = useState<number | null>(0);
  const [gotchiCoords, setGotchiCoords] = useState<number[] | null>(null);
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  useEffect(() => {
    if (!client || !account) {
      return;
    }
    client.smartContracts().readSmartContract({
      maxGas: BigInt(4000000),
      targetAddress: scAddress,
      targetFunction: "nft1_balanceOf",
      parameter: new Args().addString(account.address()),
    }).then((result) => {
      const res = new Args(result.returnValue);
      setNbCollectibles(parseInt(res.nextU64().toString(10), 10));
    });
    client.smartContracts().readSmartContract({
      maxGas: BigInt(4000000),
      targetAddress: scAddress,
      targetFunction: "balanceOf",
      parameter: new Args().addString(account.address()),
    }).then((result) => {
      setBalance(bytesToU256(result.returnValue));
    });
  }, [client]);
  async function fillAccounts(providerName: string) {
    if (account !== null) {
      // Only update React state (account & client) once
      return;
    }

    const allProviders = await providers(true, 10000);

    if (!allProviders || allProviders.length === 0) {
      throw new Error("No providers available");
    }

    const provider_ = allProviders.find(provider => provider.name() === providerName);

    if (!provider_) {
      console.log("MASSASTATION provider not found");
      return;
    }
    setProvider(provider_);

    const accounts = await provider_.accounts();
    if (accounts.length === 0) {
      console.log("No accounts found");
      return;
    }
    setAccount(accounts[0]);
    setAccounts(accounts);

    const client_ = await ClientFactory.fromWalletProvider(provider_, accounts[0]);
    client_.setCustomProviders([{url: "https://massagotchi.com/api", type: ProviderType.PUBLIC}]);
    setClient(client_);
  }
  async function changeAccount(address: string) {
    if (!accounts || !provider) {
      return;
    }
    setAccount(accounts.find(a => a.address() == address)!);
    const client_ = await ClientFactory.fromWalletProvider(provider, accounts.find(a => a.address() == address)!);
    client_.setCustomProviders([{url: "https://massagotchi.com/api", type: ProviderType.PUBLIC}]);
    setClient(client_);
  }
  async function callMint() {
    if (!client) {
      return;
    }
    const opId = await client.smartContracts().callSmartContract({
      maxGas: BigInt(4000000),
      targetAddress: scAddress,
      functionName: "mint",
      parameter: new Args().addString(account!.address()),
      fee: BigInt(0),
      coins: BigInt(500000000)
    });
    toast.promise(
      client.smartContracts().awaitRequiredOperationStatus(opId, EOperationStatus.SPECULATIVE_SUCCESS, 32000),
      {
        pending: {
          render() {
            return (
              <div>
                <p>Mint is processing</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
        success: {
          render() {
            setNbCollectibles(nbCollectibles + 1);
            setLatestOpId(opId);
            return (
              <div>
                <p>Successfully Mint</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
        error: {
          render() {
            return (
              <div>
                <p>Mint failed</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
      }
    );
  }
  function ButtonCenterMint() {
    return (
      <div>
        {nbCollectibles == 0 ? (
          <button onClick={() => callMint()} className="bg-white text-black z-20 px-4 py-2 rounded-md">Get your first Massgotchi (0.5 MAS)</button>
        ) : (
          <div className="z-30">
            <MassagotchisView account={account!} client={client!} nbCollectibles={nbCollectibles} latestOpId={latestOpId} setCurrentGotchi={setCurrentGotchi} />
            <div className="flex items-center justify-center">
              <button onClick={() => callMint()} className="bg-white text-black z-20 px-4 py-2 rounded-md">Create a new Massgotchi (0.5 MAS)</button>
            </div>
          </div>
        )}
      </div>
    )
  }
  useEffect(() => {
    if (!currentGotchi || !client) {
      return;
    }
    if (!updateInterval) {
      const interval = setInterval(async () => {
        if (!currentGotchi || !client || !account) {
          return;
        }
        const resHealth = await client.smartContracts().readSmartContract({
          targetAddress: scAddress,
          targetFunction: "getHP",
          parameter: new Args().addU64(BigInt(currentGotchi)),
          maxGas: BigInt(4000000),
        });
        const resFood = await client.smartContracts().readSmartContract({
          targetAddress: scAddress,
          targetFunction: "getFood",
          parameter: new Args().addU64(BigInt(currentGotchi)),
          maxGas: BigInt(4000000),
        });
        const resFarmed = await client.smartContracts().readSmartContract({
          targetAddress: scAddress,
          targetFunction: "getFarmed",
          parameter: new Args().addU64(BigInt(currentGotchi)),
          maxGas: BigInt(4000000),
        });
        const resCoords = await client.smartContracts().readSmartContract({
          targetAddress: scAddress,
          targetFunction: "getCoords",
          parameter: new Args().addU64(BigInt(currentGotchi)),
          maxGas: BigInt(4000000),
        });
        const farmedArgs = new Args(resFarmed.returnValue);
        const farmed = farmedArgs.nextU64();
        const hp = resHealth.returnValue[0];
        const food = resFood.returnValue[0];
        setGotchiHealth(hp);
        setGotchiFood(food);
        setGotchiCoords([resCoords.returnValue[0], resCoords.returnValue[1]]);
        setGotchiFarmed(parseInt(farmed.toString(10), 10) / 1000000000);
        const resInfos = await client.smartContracts().readSmartContract({
          targetAddress: scAddress,
          targetFunction: "getInfos",
          parameter: new Args().addU64(BigInt(currentGotchi)),
          maxGas: BigInt(4000000),
        });

        const balanceBytes = await client.smartContracts().readSmartContract({
          targetAddress: scAddress,
          targetFunction: "balanceOf",
          parameter: new Args().addString(account.address()),
          maxGas: BigInt(4000000),
        });
        setBalance(bytesToU256(balanceBytes.returnValue));

        const res = new Args(resInfos.returnValue);
        const rarity = res.nextU8();
        const state = res.nextU8();
        setGotchiInfos({hp: hp, id: currentGotchi, rarity: parseInt(rarity.toString(10), 10), state: parseInt(state.toString(10), 10) });
      }, 1000);
      setUpdateInterval(interval);
    }
    client.smartContracts().readSmartContract({
      targetAddress: scAddress,
      targetFunction: "getInfos",
      parameter: new Args().addU64(BigInt(currentGotchi)),
      maxGas: BigInt(4000000),
    }).then(async (result) => {
      const res = new Args(result.returnValue);
      const rarity = res.nextU8();
      const state = res.nextU8();
      setGotchiInfos({hp: 0, id: currentGotchi, rarity: parseInt(rarity.toString(10), 10), state: parseInt(state.toString(10), 10) });
    });
  }, [currentGotchi]);
  async function killCurrentGotchi() {
    if (!currentGotchi || !client) {
      return;
    }
    const opId = await client.smartContracts().callSmartContract({
      targetAddress: scAddress,
      functionName: "kill",
      parameter: new Args().addU64(BigInt(currentGotchi)),
      maxGas: BigInt(4000000),
      coins: BigInt(0),
      fee: BigInt(0),
    });
    toast.promise(
      client.smartContracts().awaitRequiredOperationStatus(opId, EOperationStatus.SPECULATIVE_SUCCESS, 32000),
      {
        pending: {
          render() {
            return (
              <div>
                <p>Kill operation is processing</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
        success: {
          render() {
            return (
              <div>
                <p>Successfully Killed</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
        error: {
          render() {
            return (
              <div>
                <p>Kill failed</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
      }
    );
  }

  async function feedCurrentGotchi() {
    if (!currentGotchi || !client) {
      return;
    }
    const opId = await client.smartContracts().callSmartContract({
      targetAddress: scAddress,
      functionName: "feed",
      parameter: new Args().addU64(BigInt(currentGotchi)),
      maxGas: BigInt(4000000),
      coins: BigInt(0),
      fee: BigInt(0),
    });
    toast.promise(
      client.smartContracts().awaitRequiredOperationStatus(opId, EOperationStatus.SPECULATIVE_SUCCESS, 32000),
      {
        pending: {
          render() {
            return (
              <div>
                <p>Feed operation is processing</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
        success: {
          render() {
            return (
              <div>
                <p>Successfully Fed</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
        error: {
          render() {
            return (
              <div>
                <p>Feed failed</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
      }
    );
  }

  async function claimCurrentGotchi() {
    if (!currentGotchi || !client) {
      return;
    }
    const opId = await client.smartContracts().callSmartContract({
      targetAddress: scAddress,
      functionName: "claimFarmed",
      parameter: new Args().addU64(BigInt(currentGotchi)),
      maxGas: BigInt(4000000),
      coins: BigInt(0),
      fee: BigInt(0),
    });
    toast.promise(
      client.smartContracts().awaitRequiredOperationStatus(opId, EOperationStatus.SPECULATIVE_SUCCESS, 32000),
      {
        pending: {
          render() {
            return (
              <div>
                <p>Claim operation is processing</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
        success: {
          render() {
            return (
              <div>
                <p>Successfully Claim</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
        error: {
          render() {
            return (
              <div>
                <p>Claim failed</p>
                <p><a target="_blank" href={`https://explorer.massa.net/mainnet/operation/${opId}`}>View on explorer</a></p>
              </div>
            )
          }
        },
      }
    );
  }
  return (
    <div>
      {currentGotchi && gotchiInfos ? (
        <div className="min-h-screen bg-cover bg-[url('/background.png')]">
          <header className="sticky z-50 bg-black top-0 p-6">
            {/* title on left and connect button on right */}
            <div className="flex justify-between">
              {/*Name of the game with name of studio just above */}
              <div className="flex flex-col">
                <h1 className="text-white text-2xl font-bold">Massagotchi - Early Access</h1>
                <div className="flex">
                <p className="text-white text-l">by Julie Labs</p>
                <a target="_blank" href="https://discord.gg/tR8jXNBX"><img className="w-8 h-8 ml-2" src="/icons-discord.svg" alt="Logo" /></a>
                <a target="_blank" href="https://github.com/JulieLabs/Massagotchi"><img className="w-8 h-8 ml-2" src="/icons-github.svg" alt="Logo" /></a>
                <a target="_blank" href="https://twitter.com/julie_labs10486"><img className="w-8 h-8 ml-2" src="/icons-twitter.svg" alt="Logo" /></a>
                </div>
              </div>
              {account && client && balance ? (
                <div className="text-white text-2xl">
                  <p>Balance GOTCHIs: <span className="font-bold">{parseInt(balance.toString(10), 10) / 1000000000}</span></p>
                </div>
              ) : (
                <div className="text-white text-2xl">
                  <p>Balance GOTCHIs: <span className="font-bold">-</span></p>
                </div>
              )}
              {account && accounts ? (
                <div className="flex">
                  <select onChange={(e) => { changeAccount(e.target.value) }} className="bg-white text-black px-4 py-2 rounded-md mx-2">
                    {accounts.map((account) => (
                      <option key={account.address()} value={account.address()}>
                        {account.address()}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => {
                    setAccount(null); setClient(null); setProvider(null); setCurrentGotchi(null); setGotchiInfos(null); setGotchiFood(null); setGotchiCoords(null); setGotchiHealth(null); setGotchiFarmed(null);
                    if (updateInterval) {
                      clearInterval(updateInterval);
                    }
                    setUpdateInterval(null);
                  }} className="bg-white text-black px-4 py-2 rounded-md mx-2">Disconnect</button>
                </div>
              ) : (
                <div>
                  <button className="bg-white text-black px-4 py-2 rounded-md mx-2" onClick={() => fillAccounts("BEARBY")}>Connect with Bearby</button>
                  <button className="bg-white text-black px-4 py-2 rounded-md" onClick={() => fillAccounts("MASSASTATION")}>Connect with MassaStation</button>
                </div>
              )}
            </div>
          </header>
          <ToastContainer />
          {/* image of the gotchi at the center of the page */}
          <main className="flex flex-col flex-1 items-center justify-center">
            <div className="flex flex-col" style={{
              marginLeft: `${gotchiCoords ? gotchiCoords[0] * (window.innerWidth / 2 / 200) : 0}px`,
              marginTop: `${gotchiCoords ? gotchiCoords[1] * (window.innerHeight / 2 / 100) : 0}px`,
            }}>
              <img src={`/images/collectibles/${getRarity(gotchiInfos.rarity)}/${gotchiInfos.state + 1}.png`} className="w-64 h-64" />
            </div>
          </main>
          {/* button bottom of page */}
          <div className="flex flex-col items-center justify-center sticky top-[100vh]">
            <div className="flex flex-col items-center justify-center mb-16">
              <p><span className="text-white text-xl">Food : </span><span className="text-white text-xl font-bold"> {gotchiFood}/10</span></p>
              <p>
                {gotchiHealth && gotchiHealth > 0 ? (<span className="text-xl font-bold text-green-500">Alive {gotchiHealth}/10 HP</span>) : (<span className="text-xl font-bold text-red-500">Dead</span>)}
              </p>
              <p><span className="text-white text-xl">Farmed : </span><span className="text-white text-xl font-bold">{gotchiFarmed}</span></p>
              <div><span className="text-white text-xl">Update each 10 cycles</span></div>
            </div>
            <div>
              <button onClick={() => feedCurrentGotchi()} className="bg-white text-black px-4 py-2 rounded-md mb-4 mr-8">Feed</button>
              <button onClick={() => claimCurrentGotchi()} className="bg-white text-black px-4 py-2 rounded-md mb-4 mr-8">Claim farmed GOTCHI</button>
              {/*<button onClick={() => killCurrentGotchi()} className="bg-white text-black px-4 py-2 rounded-md mb-4 mr-8">Kill </button>*/}
              <button onClick={() => {
                setCurrentGotchi(null);
                setGotchiCoords(null);
                setGotchiInfos(null); setGotchiFood(null); setGotchiHealth(null);
                setGotchiFarmed(null);
                if (updateInterval) {
                  clearInterval(updateInterval);
                }
                setUpdateInterval(null);
              }} className="bg-white text-black px-4 py-2 rounded-md mb-4">Back to Massagotchi selection</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col min-h-screen">
          <ToastContainer />
          <header className="sticky z-50 bg-black top-0 p-6">
            {/* title on left and connect button on right */}
            <div className="flex justify-between">
            <div className="flex flex-col">
                <h1 className="text-white text-2xl font-bold">Massagotchi - Early Access</h1>
                <div className="flex">
                <p className="text-white text-l">by Julie Labs</p>
                <a target="_blank" href="https://discord.gg/tR8jXNBX"><img className="w-8 h-8 ml-2" src="/icons-discord.svg" alt="Logo" /></a>
                <a target="_blank" href="https://github.com/JulieLabs/Massagotchi"><img className="w-8 h-8 ml-2" src="/icons-github.svg" alt="Logo" /></a>
                <a target="_blank" href="https://twitter.com/julie_labs10486"><img className="w-8 h-8 ml-2" src="/icons-twitter.svg" alt="Logo" /></a>
                </div>
              </div>
              {account && client && balance ? (
                <div className="text-white text-2xl">
                  <p>Balance GOTCHIs: <span className="font-bold">{parseInt(balance.toString(10), 10) / 1000000000}</span></p>
                </div>
              ) : (
                <div className="text-white text-2xl">
                  <p>Balance GOTCHIs: <span className="font-bold">-</span></p>
                </div>
              )}
              {account && accounts ? (
                <div className="flex">
                  <select onChange={(e) => { changeAccount(e.target.value) }} className="bg-white text-black px-4 py-2 rounded-md mx-2">
                    {accounts.map((account) => (
                      <option key={account.address()} value={account.address()}>
                        {account.address()}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => { setAccount(null); setClient(null); setProvider(null) }} className="bg-white text-black px-4 py-2 rounded-md mx-2">Disconnect</button>
                </div>
              ) : (
                <div>
                  <button className="bg-white text-black px-4 py-2 rounded-md mx-2" onClick={() => fillAccounts("BEARBY")}>Connect with Bearby</button>
                  <button className="bg-white text-black px-4 py-2 rounded-md" onClick={() => fillAccounts("MASSASTATION")}>Connect with MassaStation</button>
                </div>
              )}
            </div>
          </header>
          {/* button center of page */}
            <div className="flex flex-col flex-1 items-center z-20 mt-4">
              <div className="block max-w-5xl bg-black rounded-xl border-white text-center text-2xl text-bold text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] px-32">
                The first <span className="text-red-400">fully-autonomous</span> and <span className="text-red-400">decentralized</span> game.
                Collect your <span className="text-red-400">Massagotchies</span>, take care of them and watch them grow while you earn <span className="text-red-400">GOTCHIs</span> tokens!
                This game is early-access and it&apos;s a very very first version. <a href="/help">How to play ? Click here</a>
                </div>
            </div>
          <main className="flex flex-col flex-1 items-center justify-center">
            {account && client ? (
              <div className="z-20">
                {ButtonCenterMint()}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <button className="bg-white text-black z-20 px-4 py-2 rounded-md" disabled={true}>Connect at the top to see/mint your Massagotchis</button>
              </div>
            )}
          </main>
          <video autoPlay loop muted className='absolute w-full h-screen z-10'>
            <source src='/background.mp4' type='video/mp4' />
          </video>
        </div>
      )}
    </div>

  );
}

interface Collectible {
  rarity: number;
  state: number;
  id: number;
  hp: number;
}

function MassagotchisView({ account, client, nbCollectibles, latestOpId, setCurrentGotchi }: { account: IAccount, client: Client, nbCollectibles: number, latestOpId: string | null, setCurrentGotchi: Dispatch<SetStateAction<number | null>> }) {
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  useEffect(() => {
    client.smartContracts().readSmartContract({
      maxGas: BigInt(4000000),
      targetAddress: scAddress,
      targetFunction: "nft1_currentSupply",
      parameter: new Args(),
    }).then(async (result) => {
      const res = new Args(result.returnValue);
      const total = res.nextU64();
      const collectibles: Collectible[] = [];
      const prefix = "ownerOf_"
      const keys = [];
      for (let i = 1; i <= total; i++) {
        const key = strToBytes(prefix + i.toString());
        keys.push({address: scAddress, key: key});
      }
      const resTokens = await client.publicApi().getDatastoreEntries(keys);
      console.log(resTokens);
      for (let i = 1; i <= total; i++) {
        const stringAddress = bytesToStr(resTokens[i - 1].candidate_value!);
        if (stringAddress !== account.address()) {
          continue;
        }
        let infos = await client.smartContracts().readSmartContract({
          maxGas: BigInt(4000000),
          targetAddress: scAddress,
          targetFunction: "getInfos",
          parameter: new Args().addU64(BigInt(i)),
        });
        let resHp = await client.smartContracts().readSmartContract({
          maxGas: BigInt(4000000),
          targetAddress: scAddress,
          targetFunction: "getHP",
          parameter: new Args().addU64(BigInt(i)),
        });
        const hp = resHp.returnValue[0];
        const infosRes = new Args(infos.returnValue);
        const rarity = infosRes.nextU8();
        const state = infosRes.nextU8();
        collectibles.push({hp: hp, id: i, rarity: parseInt(rarity.toString(10), 10), state: parseInt(state.toString(10), 10) });
      }
      setCollectibles(collectibles);
    });
  }, [account, latestOpId]);
  return (
    <div>
      {/* if collectible empty then spinner to load  */}
      {collectibles.length === 0 ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center">
          {collectibles.map((collectible, index) => (
            <Massagotchi key={index} collectible={collectible} setCurrentGotchi={setCurrentGotchi} />
          ))}
        </div>
      )}
    </div>
  )
}

function getRarity(rarity: number) {
  if (rarity >= 0 && rarity <= 60) {
    return "common";
  } else if (rarity > 60 && rarity <= 85) {
    return "rare";
  } else if (rarity > 85 && rarity <= 95) {
    return "epic";
  } else if (rarity > 95 && rarity <= 100) {
    return "legendary";
  }
}

function Massagotchi({ collectible, setCurrentGotchi }: { collectible: Collectible, setCurrentGotchi: Dispatch<SetStateAction<number | null>> }) {
  return (
    <div className="flex flex-col items-center justify-center m-4">
      <div className="bg-white rounded-xl">
        <img src={`/images/collectibles/${getRarity(collectible.rarity)}/${collectible.state + 1}.png`} className="w-64 h-64" />
        <div className="flex flex-col items-center justify-center">
          <p><span className="text-black text-xl">Rarity : </span><span className="text-black text-xl font-bold">{getRarity(collectible.rarity)}</span></p>
          <p><span className="text-black text-xl">State : </span><span className="text-black text-xl font-bold">{collectible.state}</span></p>
          <p>{collectible.hp > 0 ? (<span className="text-xl font-bold text-green-500">Alive</span>) : (<span className="text-xl font-bold text-red-500">Dead</span>)}</p>
          <button onClick={() => { setCurrentGotchi(collectible.id) }} className="bg-purple-500 text-black px-4 py-2 rounded-md mb-4">Visit him</button>
        </div>
      </div>
    </div>

  );
}
