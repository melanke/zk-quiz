import { NetworkOptions } from "./NetworkOptions";
import { LogOut } from "lucide-react";
import { useDisconnect } from "wagmi";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Button } from "~~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~~/components/ui/dropdown-menu";

export const WrongNetworkDropdown = () => {
  const { disconnect } = useDisconnect();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="destructive" size="sm" className="mr-2 gap-1">
          <span>Wrong network</span>
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <NetworkOptions />
        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => disconnect()}>
          <LogOut className="h-4 w-4 mr-2" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
