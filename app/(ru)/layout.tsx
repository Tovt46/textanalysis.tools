import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

const geistSans=Geist({variable:"--font-geist-sans",subsets:["latin","cyrillic"]});
const geistMono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin","cyrillic"]});

export default function RussianLayout({children}:{children:React.ReactNode}) {
  return <html lang="ru"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
