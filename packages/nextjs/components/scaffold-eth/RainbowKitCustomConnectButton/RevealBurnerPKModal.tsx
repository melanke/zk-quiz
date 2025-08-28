import { useState } from "react";
import { rainbowkitBurnerWallet } from "burner-connector";
import { EyeIcon } from "lucide-react";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { Alert, AlertDescription } from "~~/components/ui/alert";
import { Button } from "~~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~~/components/ui/dialog";
import { useCopyToClipboard } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const BURNER_WALLET_PK_KEY = "burnerWallet.pk";

export const RevealBurnerPKModal = () => {
  const { copyToClipboard, isCopiedToClipboard } = useCopyToClipboard();
  const [isOpen, setIsOpen] = useState(false);

  const handleCopyPK = async () => {
    try {
      const storage = rainbowkitBurnerWallet.useSessionStorage ? sessionStorage : localStorage;
      const burnerPK = storage?.getItem(BURNER_WALLET_PK_KEY);
      if (!burnerPK) throw new Error("Burner wallet private key not found");
      await copyToClipboard(burnerPK);
      notification.success("Burner wallet private key copied to clipboard");
    } catch (e) {
      const parsedError = getParsedError(e);
      notification.error(parsedError);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm text-red-600">
          <EyeIcon className="h-4 w-4" />
          <span>Reveal Private Key</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Burner Wallet Private Key</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Alert variant="destructive">
            <ShieldExclamationIcon className="h-4 w-4" />
            <AlertDescription className="font-semibold">
              Burner wallets are intended for local development only and are not safe for storing real funds.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Your Private Key provides <strong>full access</strong> to your entire wallet and funds. This is currently
            stored <strong>temporarily</strong> in your browser.
          </p>
          <Button variant="destructive" onClick={handleCopyPK} disabled={isCopiedToClipboard} className="w-full">
            Copy Private Key To Clipboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
