import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Thank you",
  description: "Your CC Commander checkout is complete.",
  robots: { index: false, follow: false },
};

// Static on purpose: this page reads no query parameters and makes no claim
// about the payment. The tier changes only when the hosted server receives
// Stripe's signed webhook for the checkout.
export default function ThankYouPage() {
  return (
    <>
      <Nav />
      <main className="pt-24 max-w-2xl mx-auto px-4 py-16">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">
          Checkout
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">
          Thank you
        </h1>
        <p className="text-zinc-400 mb-4">
          Stripe has your checkout. Your plan becomes active on your CC
          Commander key once Stripe confirms the payment, which usually takes
          less than a minute. Stripe emails your receipt.
        </p>
        <p className="text-zinc-400 mb-10">
          If your plan has not changed within an hour, email{" "}
          <a
            href="mailto:hello@commanderplugin.com"
            className="text-orange-400 hover:text-orange-300 transition-colors"
          >
            hello@commanderplugin.com
          </a>{" "}
          with the email address you paid with.
        </p>
        <Link
          href="/"
          className="text-orange-400 hover:text-orange-300 transition-colors"
        >
          Back to the home page
        </Link>
      </main>
      <Footer />
    </>
  );
}
