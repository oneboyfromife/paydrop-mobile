import api from "./api";

export const requestOtp = async (intent: string, phone: string) => {
  try {
    const response = await api.post("/auth/request-otp", {
      intent,
      phone,
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const verifyOtp = async (data: any) => {
  try {
    const response = await api.post("/auth/verify-otp", data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data;
  }
};

export const refreshTokens = async (refreshToken: string) => {
  try {
    const response = await api.post("/auth/refresh", { refreshToken });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};
