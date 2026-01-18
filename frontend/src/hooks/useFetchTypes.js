
import { useState, useEffect } from 'react';
import { fetchTypes } from '../utils/api';

const useFetchTypes = () => {
  const [types, setTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getTypes = async () => {
      try {
        const data = await fetchTypes();
        setTypes(data);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    getTypes();
  }, []);

  return { types, isLoading, error };
};

export default useFetchTypes;
