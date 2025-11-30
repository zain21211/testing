import { useState, useCallback } from 'react';
//import { api } from '../../../utils/api'; // Adjust path as necessary for your project structure
import { AxiosError } from 'axios'; // Assuming 'api' is an axios instance
let api
// Define a type for the signup data payload
interface MechanicSignupData {
  name: string;
  email: string;
  phone: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  images: {
    shop: string[];
    machenic: string;
  },
  // Add any other fields required for mechanic signup
}

// Define a type for the successful response data from the signup API
interface MechanicSignupResponse {
  message: string;
  userId: string;
  // Add any other relevant data returned on successful signup
}

const useMachenicSignup = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const signup = useCallback(async (signupData: MechanicSignupData): Promise<MechanicSignupResponse | null> => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Assuming api.post is typed to return AxiosResponse<T>
      const response = await api.post<MechanicSignupResponse>('/mechanic-signup', signupData); // Assuming '/mechanic-signup' is your API endpoint
      if (response.status >= 200 && response.status < 300) {
        setSuccess(true);
        return response.data;
      } else {
        // This block handles cases where the API returns a non-2xx status
        // but doesn't throw an error (e.g., Axios's `validateStatus` is overridden)
        const errorMessage = (response.data as any)?.message || 'Signup failed with an unexpected status.';
        setError(errorMessage);
        return null;
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string }>;
      const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An unknown error occurred during signup.';
      setError(errorMessage);
      setSuccess(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { signup, loading, error, success };
};

export default useMachenicSignup;
