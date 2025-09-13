import { useEffect, useState } from "react";
import axios from "axios";

const url = `${import.meta.env.VITE_API_URL}`;

export default function useFetchCustImgs(id, handleImageChange, setImages) {
  const [loading, setLoading] = useState(false);
  const fetchImgs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${url}/customers/getImages`, {
        params: {
          acid: id,
        },
      });

      const images = res.data.images;
      setImages(images);
    } catch (err) {
      console.error("Error getting imgs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchImgs();
  }, [id]);

  return loading;
}
