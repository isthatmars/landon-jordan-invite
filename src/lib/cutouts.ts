/** Screen holes measured on the chroma-keyed cutouts, as fractions of the PNG. */
export const arcadeScreen = {
  left: "18.1%",
  top: "28.2%",
  width: "63.7%",
  height: "33.9%",
};

/** Video / UI hole — matches the transparent CRT screen aperture. */
export const crtScreen = {
  left: "11.0%",
  top: "25.7%",
  width: "63.3%",
  height: "60.9%",
};

/**
 * Solid black fill behind the video, slightly oversized past the aperture so
 * the lounge background never peeks through the PNG hole or green fringe.
 */
export const crtScreenFill = {
  left: "10.2%",
  top: "24.9%",
  width: "64.9%",
  height: "62.4%",
};
