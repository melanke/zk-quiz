"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import Beams from "~~/components/Beams";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const router = useRouter();
  const { address: connectedAddress, isConnecting } = useAccount();

  // Redirect to quiz if connected
  useEffect(() => {
    if (!isConnecting && connectedAddress) {
      router.push("/quiz");
    }
  }, [connectedAddress, isConnecting, router]);

  return (
    <>
      <div className="w-full h-[600px] relative flex items-center flex-col grow pt-10">
        {/* Background Beams */}
        <div className="absolute inset-0 w-full h-full z-0">
          <Beams
            beamWidth={2}
            beamHeight={15}
            beamNumber={12}
            lightColor="#ffffff"
            speed={2}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={0}
          />
        </div>

        {/* Content */}
        <div className="px-5 space-y-8 relative z-10 dark text-white">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">ZK Quiz</span>
          </h1>
          <div className="flex justify-center items-center">
            <RainbowKitCustomConnectButton size="lg" />
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
