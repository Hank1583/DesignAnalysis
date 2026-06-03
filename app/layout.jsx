import "./globals.css";

export const metadata = {
  title: "BrandHue AI 視覺設計分析平台",
  description: "以 AI 分析美的原理，並產生街景美學改造提案。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
