import { useState } from "react";

export function useCamera(
  initial = { customer: null, shop: null, agreement: null }
) {
  const [images, setImages] = useState(initial);

  const handleImageChange = (event, type) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImages((prev) => ({
        ...prev,
        [type]: URL.createObjectURL(file),
      }));
    }
  };

  const resetImages = () => setImages(initial);

  return { images, handleImageChange, resetImages };
}
