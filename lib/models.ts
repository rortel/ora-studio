export type Provider = "openai" | "anthropic" | "google" | "mistral";

export interface ModelConfig {
  id: string;
  label: string;
  provider: Provider;
  creditCost: number;
  description: string;
  badge?: string;
}

export const CHAT_MODELS: ModelConfig[] = [
  // OpenAI
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    creditCost: 3,
    description: "Le plus puissant d'OpenAI",
    badge: "Premium",
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "openai",
    creditCost: 1,
    description: "Rapide et économique",
    badge: "Rapide",
  },
  // Anthropic
  {
    id: "claude-3-5-sonnet-20241022",
    label: "Claude 3.5 Sonnet",
    provider: "anthropic",
    creditCost: 3,
    description: "Excellent en analyse et rédaction",
    badge: "Premium",
  },
  {
    id: "claude-3-haiku-20240307",
    label: "Claude 3 Haiku",
    provider: "anthropic",
    creditCost: 1,
    description: "Ultra rapide et léger",
    badge: "Rapide",
  },
  // Google
  {
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    provider: "google",
    creditCost: 2,
    description: "Contexte jusqu'à 1M tokens",
  },
  {
    id: "gemini-1.5-flash",
    label: "Gemini Flash",
    provider: "google",
    creditCost: 1,
    description: "Rapide et polyvalent",
    badge: "Rapide",
  },
  // Mistral
  {
    id: "mistral-large-latest",
    label: "Mistral Large",
    provider: "mistral",
    creditCost: 2,
    description: "Meilleur modèle Mistral",
  },
  {
    id: "mistral-small-latest",
    label: "Mistral Small",
    provider: "mistral",
    creditCost: 1,
    description: "Rapide, souverain européen",
    badge: "Rapide",
  },
];

export const PROVIDER_COLORS: Record<Provider, string> = {
  openai: "text-green-400 bg-green-400/10",
  anthropic: "text-orange-400 bg-orange-400/10",
  google: "text-blue-400 bg-blue-400/10",
  mistral: "text-violet-400 bg-violet-400/10",
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  mistral: "Mistral",
};

export function getModel(id: string): ModelConfig | undefined {
  return CHAT_MODELS.find((m) => m.id === id);
}
