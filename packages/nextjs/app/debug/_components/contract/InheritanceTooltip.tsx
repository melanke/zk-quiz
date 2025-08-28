import { InformationCircleIcon } from "@heroicons/react/20/solid";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~~/components/ui/tooltip";

export const InheritanceTooltip = ({ inheritedFrom }: { inheritedFrom?: string }) => (
  <>
    {inheritedFrom && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="px-2 cursor-help">
              <InformationCircleIcon className="h-4 w-4" aria-hidden="true" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Inherited from: {inheritedFrom}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </>
);
