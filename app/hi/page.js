import TapCard from "@/components/hi/TapCard";

// Where the NFC ring and sticker land, by way of /r/. Read on a stranger's
// phone a few seconds after a tap, so it is one light page with no WebGL:
// who I am, how to keep in touch, and a few pieces of work.
export const metadata = {
  title: "Tina Shen",
  description:
    "Stanford ICME MS student working on scientific ML and generative models. Contact, LinkedIn and recent work.",
};

export default function Page() {
  return <TapCard />;
}
