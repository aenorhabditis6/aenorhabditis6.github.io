import "./globals.css";

export const metadata = {
  title: "Tina Shen — Works",
  description:
    "Six pieces of work in physics, applied mathematics and making things, three plates each. Every card is painted from the maths it stands for.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
