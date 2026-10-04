import { ImageResponse } from "next/og";

export const size = {
  width: 256,
  height: 256,
};
export const contentType = "image/png";

/** Sekme ikonu: degrade zeminde T. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fe2c55 0%, #7c3aed 100%)",
          borderRadius: "22%",
          fontSize: 150,
          fontWeight: 900,
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        T
      </div>
    ),
    {
      ...size,
    }
  );
}
