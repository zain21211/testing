import html2canvas from "html2canvas";
import React from "react";

export const takeScreenShot = async (targetRef) => {
  if (!targetRef || !targetRef.current) return;

  const target = targetRef.current;

  const fullCanvas = await html2canvas(target, {
    scale: 2,
    scrollY: -window.scrollY,
    useCORS: true,
    allowTaint: true,
  });

  const MAX_HEIGHT = 3000;
  const totalHeight = fullCanvas.height;
  const width = fullCanvas.width;

  if (totalHeight <= MAX_HEIGHT) {
    // Single screenshot
    const image = fullCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = "screenshot-full.png";
    link.click();
  } else {
    // Break into parts
    const partHeight = MAX_HEIGHT;
    const parts = Math.ceil(totalHeight / partHeight);

    for (let i = 0; i < parts; i++) {
      const canvasPart = document.createElement("canvas");
      canvasPart.width = width;
      canvasPart.height = partHeight;

      const context = canvasPart.getContext("2d");
      context.drawImage(
        fullCanvas,
        0,
        i * partHeight,
        width,
        partHeight,
        0,
        0,
        width,
        partHeight
      );

      const image = canvasPart.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `screenshot-part-${i + 1}.png`;
      link.click();

      await new Promise((resolve) => setTimeout(resolve, 500)); // Optional delay
    }
  }
};
