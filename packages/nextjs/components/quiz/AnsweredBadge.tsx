"use client";

import { ArrowUp, CheckCircle } from "lucide-react";
import { useAccount } from "wagmi";
import { Tooltip, TooltipContent, TooltipTrigger } from "~~/components/ui/tooltip";
import { cn } from "~~/lib/utils";
import { getAnswerStatus } from "~~/utils/localStorage";

type AnswerStatus = "not_answered" | "pending_submission" | "submitted";

interface AnsweredBadgeProps {
  /** Question hash to check if answered */
  questHash: string;
  /** Font size */
  fontSize?: "xs" | "sm" | "base" | "lg";
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Badge variant */
  variant?: "default" | "outline" | "secondary";
  /** Force a specific status (useful for special cases) */
  forceStatus?: AnswerStatus;
}

export function AnsweredBadge({
  questHash,
  fontSize = "sm",
  showIcon = true,
  className,
  variant = "default",
  forceStatus,
}: AnsweredBadgeProps) {
  const { address } = useAccount();

  // Check answer status
  const status = forceStatus || (address ? getAnswerStatus(questHash, address) : "not_answered");

  // If not answered, don't render anything
  if (status === "not_answered") {
    return null;
  }

  // Status-based configuration
  const statusConfig = {
    pending_submission: {
      text: "Submission Pending",
      icon: ArrowUp,
      tooltip: "You have saved answers. Check the header to submit to blockchain.",
      colors: {
        default:
          "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
        outline: "bg-transparent text-yellow-700 border border-yellow-300 dark:text-yellow-400 dark:border-yellow-700",
        secondary: "bg-secondary text-secondary-foreground",
      },
    },
    submitted: {
      text: "Answered",
      icon: CheckCircle,
      tooltip: "Answer submitted and confirmed on blockchain",
      colors: {
        default:
          "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
        outline: "bg-transparent text-green-700 border border-green-300 dark:text-green-400 dark:border-green-700",
        secondary: "bg-secondary text-secondary-foreground",
      },
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config.icon;

  // Map font sizes
  const fontSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
  };

  // Map icon sizes based on font size
  const iconSizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    base: "w-5 h-5",
    lg: "w-6 h-6",
  };

  // Base badge classes with dark theme support
  const baseClasses = cn(
    "inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium",
    fontSizeClasses[fontSize],
    config.colors[variant],
    className,
  );

  const BadgeContent = (
    <div className={baseClasses}>
      {showIcon && <Icon className={cn(iconSizeClasses[fontSize], "flex-shrink-0")} />}
      <span className="font-medium">{config.text}</span>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{BadgeContent}</TooltipTrigger>
      <TooltipContent>
        <p>{config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
