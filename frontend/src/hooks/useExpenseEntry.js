// hooks/useExpenseEntry.js
import axios from "axios";
import useGeolocation from "./geolocation";
const KNOWN_EXPENSE_METHODS = [
  "petrol",
  "entertainment",
  "bilty",
  "repair",
  "zaqat",
  "localpurchase",
  "exp",
  "salary",
  "salesbonus",
  "toll",
];

export const useExpenseEntry = () => {
  const url = import.meta.env.VITE_API_URL;

  const { coordinates: location, error: geoError, address } = useGeolocation();
  location.address = address;
  const makeExpenseEntry = async (entry) => {
    console.log("Geolocation data:", location, geoError);
    try {
      const { amounts, custId, userName, userType } = entry;
      console.log("makeExpenseEntry called with:", {
        amounts,
        custId,
        userName,
        userType,
      });

      if (
        !amounts ||
        typeof amounts !== "object" ||
        Object.keys(amounts).length === 0
      ) {
        return {
          success: true,
          results: [],
          message: "No amounts to process.",
        };
      }

      if (!custId || !userName) {
        return {
          success: false,
          results: [],
          message: "Missing custId or userName.",
        };
      }

      // Filter out entries with zero or invalid amounts
      const entriesToPost = Object.entries(amounts).filter(
        ([_methodKey, amount]) => typeof amount === "number" && amount > 0
      );

      if (entriesToPost.length === 0) {
        return {
          success: true,
          results: [],
          message: "No valid entries with amount > 0 to post.",
        };
      }

      const operationResults = [];
      let allSubEntriesSuccessful = true;

      for (const [methodKey, amount] of entriesToPost) {
        const lowerMethodKey = methodKey.toLowerCase();
        let payload = {
          custId,
          receivedAmount: amount,
          userName,
          userType,
          location,
          date: new Date().toISOString(),
        };

        if (KNOWN_EXPENSE_METHODS.includes(lowerMethodKey)) {
          payload.expenseMethod = lowerMethodKey;
        } else {
          if (lowerMethodKey === "crownwallet") {
            payload.paymentMethod = "crownone";
          } else if (lowerMethodKey === "meezanbank") {
            payload.paymentMethod = "mbl";
          } else {
            payload.paymentMethod = lowerMethodKey;
          }
        }

        try {
          console.log("Posting to /cash-entry with payload:", payload);
          const response = await axios.post(`${url}/cash-entry`, payload);

          if (response.status === 200 || response.status === 201) {
            operationResults.push({
              methodKey,
              success: true,
              data: response.data,
            });
          } else {
            allSubEntriesSuccessful = false;
            operationResults.push({
              methodKey,
              success: false,
              error: `API Error: Status ${response.status}`,
              data: response.data,
            });
          }
        } catch (error) {
          allSubEntriesSuccessful = false;
          let errorMessage = "An unknown error occurred.";

          if (axios.isAxiosError(error)) {
            if (error.response) {
              errorMessage =
                error.response.data?.error ||
                error.response.data?.message ||
                `Server Error: ${error.response.status}`;
              console.error(`API Error for ${methodKey}:`, error.response.data);
              operationResults.push({
                methodKey,
                success: false,
                error: errorMessage,
                data: error.response.data,
              });
            } else if (error.request) {
              errorMessage = "Network Error: No response received from server.";
              console.error(`Network Error for ${methodKey}:`, error.request);
              operationResults.push({
                methodKey,
                success: false,
                error: errorMessage,
              });
            } else {
              errorMessage = `Request Setup Error: ${error.message}`;
              console.error(
                `Request Setup Error for ${methodKey}:`,
                error.message
              );
              operationResults.push({
                methodKey,
                success: false,
                error: errorMessage,
              });
            }
          } else {
            console.error(`Error processing ${methodKey}:`, error);
            operationResults.push({
              methodKey,
              success: false,
              error: error.message || "An unexpected error occurred.",
            });
          }
        }
      }

      return {
        success: allSubEntriesSuccessful,
        results: operationResults,
        message: allSubEntriesSuccessful
          ? "All entries processed."
          : "Some entries failed.",
      };
    } catch (error) {
      console.error("Critical error in makeExpenseEntry:", error);
      return {
        success: false,
        results: [],
        message:
          error.message || "A critical error occurred while preparing entries.",
      };
    }
  };

  return { makeExpenseEntry };
};
