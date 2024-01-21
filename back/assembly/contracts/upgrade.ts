import { Args } from "@massalabs/as-types";
import { Address, call, fileToByteArray } from "@massalabs/massa-as-sdk";

export function main(_: StaticArray<u8>): void {
    // SC Address
    const MassaGotchi = new Address("AS12WirWdurggUQSnRTx6cJ5DqwkdWJAkgBXx95yZhzxaWs5eSoaK");
  
    // updated wasm
    const massaGotchiWasm: StaticArray<u8> = fileToByteArray('build/main.wasm');
  
    // If the SC has no MASSA, you need to send some to it (remplace the 0 by the amount you want to send, ex: 10 * 10**9)
    call(MassaGotchi, 'upgradeSC', new Args(massaGotchiWasm), 0);
    return;
  }