"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { QuizActions } from "~~/components/QuizActions";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { Button } from "~~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~~/components/ui/sheet";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { cn } from "~~/lib/utils";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
  },
];

export const HeaderMenuLinks = ({ className }: { className?: string }) => {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col lg:flex-row lg:items-center gap-2", className)}>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "hover:bg-secondary/80 hover:text-secondary-foreground",
            )}
          >
            {icon}
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky lg:static top-0 z-20 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <div className="relative h-8 w-8">
              <Image alt="SE2 logo" className="cursor-pointer" fill src="/logo.svg" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm">Scaffold-ETH</span>
              <span className="text-xs text-muted-foreground">Ethereum dev stack</span>
            </div>
          </Link>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Bars3Icon className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <Link href="/" className="flex items-center space-x-2" onClick={() => setIsOpen(false)}>
              <div className="relative h-8 w-8">
                <Image alt="SE2 logo" className="cursor-pointer" fill src="/logo.svg" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">Scaffold-ETH</span>
                <span className="text-xs text-muted-foreground">Ethereum dev stack</span>
              </div>
            </Link>
            <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
              <div onClick={() => setIsOpen(false)}>
                <HeaderMenuLinks className="flex-col items-start space-x-0 space-y-1" />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="hidden md:flex">
              <HeaderMenuLinks />
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <QuizActions />
            <RainbowKitCustomConnectButton />
            {isLocalNetwork && <FaucetButton />}
          </nav>
        </div>
      </div>
    </header>
  );
};
