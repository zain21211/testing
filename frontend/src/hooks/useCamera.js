import { useEffect, useState } from "react";
import imageCompression from "browser-image-compression";

export function useCamera(
  initial = { customer: null, shop: null, agreement: null }
) {
  const [images, setImages] = useState(initial);
  useEffect(() => {
    console.log("Images state updated:", images?.customer?.length);
  }, [images]);
  const handleImageChange = async (event, type) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      // 🔹 Compress image before reading it
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.3, // Target around 300 KB
        maxWidthOrHeight: 1280, // Resize if needed
        useWebWorker: true,
      });

      // 🔹 Read the compressed file as base64
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => ({
          ...prev,
          [type]: reader.result, // smaller base64 string now
        }));
      };
      reader.readAsDataURL(compressedFile);
    }
  };

  const resetImages = () => setImages(initial);

  return { images, handleImageChange, resetImages, setImages };
}
