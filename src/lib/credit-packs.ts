// Credit packs users can buy. amountPaise is the Razorpay charge in paise
// (₹1 = 100 paise). Tune the prices/credits here — it's a business decision.
export type CreditPack = {
  id: string;
  label: string;
  credits: number;
  amountPaise: number;
  badge?: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", label: "Starter", credits: 250, amountPaise: 14900 }, // ₹149
  { id: "popular", label: "Popular", credits: 750, amountPaise: 39900, badge: "Best value" }, // ₹399
  { id: "pro", label: "Pro", credits: 2000, amountPaise: 89900 }, // ₹899
];

export function findPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function rupees(amountPaise: number): string {
  return `₹${(amountPaise / 100).toLocaleString("en-IN")}`;
}
