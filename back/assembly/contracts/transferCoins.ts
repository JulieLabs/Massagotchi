import { Address, transferCoins } from "@massalabs/massa-as-sdk";

export function main(): void {
    transferCoins(new Address("AU12RiHrP8MU2CnHxC17SxfySDg6kjbR8fTgAxBzL9BGVgFawYpZa"), 10000000000);
}