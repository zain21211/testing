import { useEffect, useState } from "react";
import axios from "axios";

const url = `${import.meta.env.VITE_API_URL}`;

export default function useFetchCustImgs(
  id,
  handleImageChange,
  setImages,
  col
) {
  const [loading, setLoading] = useState(false);
  const fetchImgs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${url}/customers/getImages`, {
        params: {
          acid: id,
          col,
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
    console.log("Fetching images for ID:", id);
    if (id) fetchImgs();
  }, [id]);

  return loading;
}
