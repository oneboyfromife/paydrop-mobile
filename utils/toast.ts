import { toast } from "sonner-native";

export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
    });
  },
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
    });
  },
  info: (message: string, description?: string) => {
    toast(message, {
      description,
    });
  },
  loading: (message: string, description?: string) => {
    return toast.loading(message, {
      description,
    });
  },
  dismiss: (id?: string | number) => {
    toast.dismiss(id);
  },
};
