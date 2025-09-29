import { useEffect, useState } from "react";
import axios from "axios";

interface Remark {
  id: number;
  text: string;
  date: string;
  // 👆 adjust fields according to your API response
}

interface UseFetchRemarksResult {
  remarks: Remark[];
  loading: boolean;
  error: string | null;
}

export function useFetchRemarks(
  open: boolean,
  acid: string | number | null,
  API_URL: string
): UseFetchRemarksResult {
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRemarks = async () => {
      if (!open || !acid) return;

      setLoading(true);
      setError(null);

      try {
        const res = await axios.get(`${API_URL}/turnover/remarks`, {
          params: { acid },
        });
        setRemarks(res.data || []);
      } catch (err) {
        console.error("Failed to fetch remarks:", err);
        setError("Failed to fetch past remarks.");
      } finally {
        setLoading(false);
      }
    };

    fetchRemarks();
  }, [open, acid, API_URL]);

  return { remarks, loading, error };
}
