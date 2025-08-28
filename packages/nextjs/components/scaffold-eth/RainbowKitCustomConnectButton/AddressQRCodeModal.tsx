import { QrCodeIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Address as AddressType } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~~/components/ui/dialog";

export const AddressQRCodeModal = ({ address }: { address: AddressType }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm">
          <QrCodeIcon className="h-4 w-4" />
          <span>View QR Code</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Address QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-6">
          <QRCodeSVG value={address} size={256} />
          <Address address={address} format="long" disableAddressLink onlyEnsOrAddress />
        </div>
      </DialogContent>
    </Dialog>
  );
};
