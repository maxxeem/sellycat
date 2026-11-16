import localFont from "next/font/local";

/** Inter from the brand kit (OFL), self-hosted: no request to Google. */
export const inter = localFont({
  src: [
    { path: "./fonts/Inter-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Inter-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Inter-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});
