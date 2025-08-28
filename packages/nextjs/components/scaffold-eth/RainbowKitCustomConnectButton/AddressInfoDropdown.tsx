import { useState } from "react";
import { AddressQRCodeModal } from "./AddressQRCodeModal";
import { NetworkOptions } from "./NetworkOptions";
import { RevealBurnerPKModal } from "./RevealBurnerPKModal";
import { LogOut } from "lucide-react";
import { getAddress } from "viem";
import { Address } from "viem";
import { useAccount, useDisconnect } from "wagmi";
import {
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { BlockieAvatar, isENS } from "~~/components/scaffold-eth";
import { Button } from "~~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~~/components/ui/dropdown-menu";
import { useCopyToClipboard } from "~~/hooks/scaffold-eth";
import { getTargetNetworks } from "~~/utils/scaffold-eth";

const BURNER_WALLET_ID = "burnerWallet";

const allowedNetworks = getTargetNetworks();

type AddressInfoDropdownProps = {
  address: Address;
  blockExplorerAddressLink: string | undefined;
  displayName: string;
  ensAvatar?: string;
};

export const AddressInfoDropdown = ({
  address,
  ensAvatar,
  displayName,
  blockExplorerAddressLink,
}: AddressInfoDropdownProps) => {
  const { disconnect } = useDisconnect();
  const { connector } = useAccount();
  const checkSumAddress = getAddress(address);

  const { copyToClipboard: copyAddressToClipboard, isCopiedToClipboard: isAddressCopiedToClipboard } =
    useCopyToClipboard();
  const [selectingNetwork, setSelectingNetwork] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="pl-0 pr-2 gap-0 h-auto">
            <BlockieAvatar address={checkSumAddress} size={30} ensImage={ensAvatar} />
            <span className="ml-2 mr-1">
              {isENS(displayName) ? displayName : checkSumAddress?.slice(0, 6) + "..." + checkSumAddress?.slice(-4)}
            </span>
            <ChevronDownIcon className="h-4 w-4 ml-2 sm:ml-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <NetworkOptions hidden={!selectingNetwork} />
          <DropdownMenuItem
            className={selectingNetwork ? "hidden" : ""}
            onClick={() => copyAddressToClipboard(checkSumAddress)}
          >
            {isAddressCopiedToClipboard ? (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Copy address</span>
              </>
            )}
          </DropdownMenuItem>

          <div className={selectingNetwork ? "hidden" : ""}>
            <AddressQRCodeModal address={checkSumAddress} />
          </div>

          <DropdownMenuItem className={selectingNetwork ? "hidden" : ""} asChild>
            <a target="_blank" href={blockExplorerAddressLink} rel="noopener noreferrer">
              <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
              <span>View on Block Explorer</span>
            </a>
          </DropdownMenuItem>

          {allowedNetworks.length > 1 && (
            <DropdownMenuItem className={selectingNetwork ? "hidden" : ""} onClick={() => setSelectingNetwork(true)}>
              <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
              <span>Switch Network</span>
            </DropdownMenuItem>
          )}

          {connector?.id === BURNER_WALLET_ID && <RevealBurnerPKModal />}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={`text-red-600 focus:text-red-600 ${selectingNetwork ? "hidden" : ""}`}
            onClick={() => disconnect()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
