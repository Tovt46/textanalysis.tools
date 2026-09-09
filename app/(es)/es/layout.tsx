import { Geist, Geist_Mono } from "next/font/google";
import "../../globals.css";
import "../../redesign-system.css";
import ThemeInit from "../../ThemeInit";
import Analytics from "../../Analytics";

export const revalidate=300;

const geistSans=Geist({variable:"--font-geist-sans",subsets:["latin"]});
const geistMono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin"]});

export default function SpanishLayout({children}:{children:React.ReactNode}){
  return <html lang="es" suppressHydrationWarning><head><ThemeInit/></head><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}<Analytics/></body></html>;
}
