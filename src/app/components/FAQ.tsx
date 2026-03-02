import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus } from "lucide-react";

type CreditCostRow = {
  action: string;
  credits: string;
  result: string;
};

const creditCostGuide: CreditCostRow[] = [
  {
    action: "Text generation (fast model)",
    credits: "1",
    result: "One text output from Gemini 2.5 Flash, GPT-4o Mini, Claude Haiku 4, or Mistral Small",
  },
  {
    action: "Text generation (pro model)",
    credits: "2",
    result: "One text output from Claude Sonnet 4, GPT-4o, Gemini 2.5 Pro, or Mistral Large",
  },
  {
    action: "Image generation",
    credits: "3",
    result: "One image from Imagen 3, DALL-E 3, Flux 1.1 Pro, Gemini Image, Seedream 5.0, or Recraft V3",
  },
  {
    action: "Arena - text (3 models)",
    credits: "5",
    result: "Three text outputs side by side, pick or mix",
  },
  {
    action: "Arena - image (3 models)",
    credits: "9",
    result: "Three images side by side",
  },
  {
    action: "Video generation",
    credits: "10",
    result: "One short video clip from Veo 2, Kling 3.0 Pro, MiniMax Hailuo, or Sora 2",
  },
  {
    action: "Studio asset (text + compliance)",
    credits: "5",
    result: "Brief -> generation -> Brand Vault check -> publish-ready",
  },
  {
    action: "Studio asset (text + image + compliance)",
    credits: "8",
    result: "Full asset with visual and compliance scoring",
  },
];

type FAQItem = {
  q: string;
  a: ReactNode;
};

const faqs: FAQItem[] = [
  {
    q: "What makes ORA different from ChatGPT or Claude directly?",
    a: "When you use ChatGPT, you only get GPT. When you use Claude, you only get Claude. ORA gives you every major model in one place - plus Arena to compare outputs, and Studio with Brand Vault when you need brand control. One account replaces multiple subscriptions.",
  },
  {
    q: "Can I use ORA without Brand Vault?",
    a: "Yes. Brand Vault is only part of Studio mode, and Studio is only available on the €149 plan. The Simple and Advanced plans give you full access to Hub, Chat, and Arena - no brand setup needed. Most users start there.",
  },
  {
    q: "How does Arena work?",
    a: "You write one prompt. Arena sends it to 2-4 models in parallel. You see every result side by side and pick the best one - or mix parts from different outputs into a single final version. It costs one credit per model used.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "You can buy a top-up anytime - credits are added instantly. Or you wait until your monthly credits reset on your next billing date. ORA never charges you automatically for extra credits.",
  },
  {
    q: "What does one credit get you?",
    a: (
      <div className="space-y-3">
        <p style={{ fontSize: "14px", lineHeight: 1.65 }}>
          Credit usage depends on the type of generation. Here is the credit cost guide:
        </p>
        <div className="overflow-x-auto bg-card border border-border rounded-lg">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                  Action
                </th>
                <th className="text-left p-4 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                  Credits
                </th>
                <th className="text-left p-4 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                  What you get
                </th>
              </tr>
            </thead>
            <tbody>
              {creditCostGuide.map((row) => (
                <tr key={row.action} className="border-b border-border last:border-b-0">
                  <td className="p-4 text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>
                    {row.action}
                  </td>
                  <td className="p-4 text-foreground" style={{ fontSize: "14px" }}>
                    {row.credits}
                  </td>
                  <td className="p-4 text-muted-foreground" style={{ fontSize: "14px" }}>
                    {row.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    q: "Do unused monthly credits roll over?",
    a: "Monthly subscription credits reset each billing cycle. If you don't use them, they expire. However, credits purchased as top-ups or credit packs never expire.",
  },
  {
    q: "Can I switch plans?",
    a: "Anytime. Upgrades take effect immediately - you get access to the new plan's features and a prorated credit adjustment. Downgrades take effect at the next billing cycle.",
  },
  {
    q: "Is my content private?",
    a: "Yes. Your prompts, outputs, Brand Vault data, and documents are yours. ORA does not use your content to train AI models. We don't share your data with model providers beyond what's needed to generate your request.",
  },
  {
    q: "Can I use ORA for client work?",
    a: "Absolutely. The Studio plan with Brand Vault is designed for agencies and teams producing content for clients. You can create separate vaults per client and manage assets with approval workflows.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="max-w-[820px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2
            className="text-foreground mb-4"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            Frequently asked questions
          </h2>
        </motion.div>

        <div>
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-border"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left group cursor-pointer"
                >
                  <span className="text-foreground pr-4" style={{ fontSize: "15px", fontWeight: 450 }}>
                    {faq.q}
                  </span>
                  <span className="text-muted-foreground flex-shrink-0 group-hover:text-foreground transition-colors">
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pb-5 text-muted-foreground" style={{ fontSize: "14px", lineHeight: 1.65 }}>
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
