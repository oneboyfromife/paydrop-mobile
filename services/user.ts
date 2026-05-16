import api from "./api";

export const getMe = async () => {
  try {
    const response = await api.get("/users/me");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const getWalletBalance = async () => {
  try {
    const response = await api.get("/wallet/balance");
    return response.data;
  } catch (error: any) {
    console.log("ERROR!", error);
    throw error.response?.data || error.message;
  }
};

export const getTransactions = async (page = 1, limit = 10) => {
  try {
    const response = await api.get("/transactions", {
      params: { page, limit },
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const getQrCode = async () => {
  try {
    const response = await api.get("/discover/qr");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const broadcastDiscovery = async ({ token }: { token: string }) => {
  try {
    const response = await api.post("/discover/broadcast", { token });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const stopDiscoveryBroadcast = async () => {
  try {
    const response = await api.delete("/discover/broadcast");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

/** Backend expects `{ token }` (singular), not `{ tokens: [] }`. */
export const resolveDiscoveryToken = async (token: string) => {
  try {
    const response = await api.post("/discover/resolve", { token });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const resolveDiscoveryTokens = async (tokens: string[]) => {
  const unique = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))];
  const users: Record<string, unknown>[] = [];

  for (const token of unique) {
    try {
      const data = await resolveDiscoveryToken(token);
      if (data?.user && data.user.id) {
        if (!users.some((u) => u.id === data.user.id)) {
          users.push(data.user);
        }
        continue;
      }
      const list = Array.isArray(data)
        ? data
        : data?.users || data?.resolved || data?.data;
      if (Array.isArray(list)) {
        list.forEach((user: { id?: string }) => {
          if (user?.id && !users.some((u) => u.id === user.id)) {
            users.push(user);
          }
        });
      }
    } catch (err) {
      console.warn("[Discover] Failed to resolve token:", token, err);
    }
  }

  if (users.length === 1) return { user: users[0] };
  if (users.length > 1) return { users };
  return { users: [] };
};

export const getFraudDetail = async (id: string) => {
  try {
    const response = await api.get(`/transactions/${id}/fraud-detail`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const getNotifications = async () => {
  try {
    const response = await api.get("/notifications");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};
