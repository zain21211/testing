import { useState } from "react";

export function useCamera(
  initial = { customer: null, shop: null, agreement: null }
) {
  const [images, setImages] = useState(initial);

  const handleImageChange = (event, type) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => ({
          ...prev,
          [type]: reader.result, // <-- this will be "data:image/jpeg;base64,..."
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetImages = () => setImages(initial);

  return { images, handleImageChange, resetImages };
}
