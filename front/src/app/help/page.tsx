export default function HelpPage() {
    return (
        <div className="min-h-screen bg-cover bg-[url('/background.png')]">
            <div className="text-3xl flex flex-col flex-1 items-center justify-center">
                <p className="text-bold">How to play Massagotchi ?</p>
                <div className="text-xl">
                    <p className="mt-2">Step 1 : Connect to a wallet</p>
                    <p className="mt-2">Step 2 : Collect your first Massagotchi by clicking on the middle button. You might have a legendary one !</p>
                    <p className="mt-2">Step 3 : Visit your Massagotchi. You will see that he has food level and HP</p>
                    <p className="mt-2">Step 4 : Your Massagotchi loose food autonomously. Maintain a good food level by feeding him (button at the bottom)</p>
                    <p className="mt-2">Step 5 : Your Massagotchies farm autonomously GOTCHI tokens while they are alive. Claim them !</p>
                    <p className="mt-2">Step 6 : You Massagotchi can evolve to different states autonomously if they are healthy</p>
                </div>
                <div className="mt-16 grid grid-cols-2 gap-64">
                    <div>
                        <div className="text-bold">Precisions</div>
                        <div className="text-xl w-96">
                        <p>- Massagotchies loose HPs at 0 level food and regain at 10</p>
                        <p>- Massagotchies have a chance to evolve while they are at 10 HP</p>
                        <p>- Massagotchies more rare and more evolve farm more coins</p>
                        <p>- The only cost in the whole game is the 0.5 MAS to create a Massagotchi, the rest is free (except if network fees is necessary (not for now on Massa))</p>
                        <p>- The GOTCHIs tokens earned now don&apos;t have value for now but will be converted in real money game when it will be created.</p>
                        <p>- SC is upgradable.</p>
                        </div>
                    </div>
                    <div>
                    <div className="text-bold">Rarity chances</div>
                    <div className="text-xl w-96">
                        <p>- Common : 60%</p>
                        <p>- Rare : 25%</p>
                        <p>- Epic : 10%</p>
                        <p>- Legendary : 5%</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};