import React from "react";
import { toast } from "sonner";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";

type NotificationOptions = {
  duration?: number;
  icon?: React.ReactNode;
};

const ENUM_STATUSES = {
  success: <CheckCircleIcon className="w-4 h-4" />,
  error: <ExclamationCircleIcon className="w-4 h-4" />,
  info: <InformationCircleIcon className="w-4 h-4" />,
  warning: <ExclamationTriangleIcon className="w-4 h-4" />,
};

const DEFAULT_DURATION = 3000;

export const notification = {
  success: (content: React.ReactNode, options?: NotificationOptions) => {
    return toast.success(content, {
      duration: options?.duration || DEFAULT_DURATION,
      icon: options?.icon || ENUM_STATUSES.success,
    });
  },
  info: (content: React.ReactNode, options?: NotificationOptions) => {
    return toast.info(content, {
      duration: options?.duration || DEFAULT_DURATION,
      icon: options?.icon || ENUM_STATUSES.info,
    });
  },
  warning: (content: React.ReactNode, options?: NotificationOptions) => {
    return toast.warning(content, {
      duration: options?.duration || DEFAULT_DURATION,
      icon: options?.icon || ENUM_STATUSES.warning,
    });
  },
  error: (content: React.ReactNode, options?: NotificationOptions) => {
    return toast.error(content, {
      duration: options?.duration || DEFAULT_DURATION,
      icon: options?.icon || ENUM_STATUSES.error,
    });
  },
  loading: (content: React.ReactNode, options?: NotificationOptions) => {
    return toast.loading(content, {
      duration: options?.duration || Infinity,
      icon: options?.icon,
    });
  },
  remove: (toastId: string | number) => {
    toast.dismiss(toastId);
  },
};
