import { useEffect } from "react";
import axios from "axios";

const url = `${import.meta.env.VITE_API_URL}`;

export default function useFetchCustImgs(id, handleImageChange, setImages) {
  const fetchImgs = async () => {
    try {
      const res = await axios.get(`${url}/customers/getImages`, {
        params: {
          acid: id,
        },
      });

      const images = res.data.images;
      setImages(images);
    } catch (err) {
      console.error("Error getting imgs:", err);
    }
  };

  useEffect(() => {
    if (id) fetchImgs();
  }, [id]);

  return;
}
