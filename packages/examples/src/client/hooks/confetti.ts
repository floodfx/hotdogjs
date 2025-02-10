import type { ViewHook } from "@hotdogjs/client/hook";
import JSConfetti from "js-confetti";
import { z } from "zod";

// only create one instance of JSConfetti
let jsConfetti: JSConfetti;

// copy of IAddConfettiConfig from js-confetti since it's not exported
interface ConfettiOptions {
  confettiRadius?: number;
  confettiNumber?: number;
  confettiColors?: string[];
  emojis?: string[];
  emojiSize?: number;
}

// zod schema for confetti options
const confettiOptionsSchema = z
  .object({
    radius: z
      .string()
      .transform((str) => Number(str))
      .pipe(z.number())
      .optional(),
    number: z
      .string()
      .transform((str) => Number(str))
      .pipe(z.number())
      .optional(),
    colors: z
      .string()
      .transform((str) => str.split(",").map((s) => s.trim()))
      .refine((colors) => colors.every((color) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)), {
        message: "All colors must be valid hex colors (e.g., #ff0000 or #f00)",
      })
      .optional(),
    emojis: z
      .string()
      .transform((str) => str.split(",").map((s) => s.trim()))
      .optional(),
    emojisize: z
      .string()
      .transform((str) => Number(str))
      .pipe(z.number())
      .optional(),
  })
  // map from data-confetti-* attributes to js-confetti options
  .transform((data) => ({
    confettiRadius: data.radius,
    confettiNumber: data.number,
    confettiColors: data.colors,
    emojis: data.emojis,
    emojiSize: data.emojisize,
  }));

// events that can be fired from the server
export const ConfettiEvents = {
  fireConfetti: "fireConfetti",
} as const;

// configureConfetti
export function configureConfetti(confettiOptions: ConfettiOptions): string {
  const dataAttributes: string[] = [];
  if (confettiOptions.confettiRadius) {
    dataAttributes.push(`data-confetti-radius="${confettiOptions.confettiRadius}"`);
  }
  if (confettiOptions.confettiNumber) {
    dataAttributes.push(`data-confetti-number="${confettiOptions.confettiNumber}"`);
  }
  if (confettiOptions.confettiColors) {
    dataAttributes.push(`data-confetti-colors="${confettiOptions.confettiColors.join(",")}"`);
  }
  if (confettiOptions.emojis) {
    dataAttributes.push(`data-confetti-emojis="${confettiOptions.emojis.join(",")}"`);
  }
  if (confettiOptions.emojiSize) {
    dataAttributes.push(`data-confetti-emojisize="${confettiOptions.emojiSize}"`);
  }
  return ` hd-hook="Confetti" ${dataAttributes.join(" ")} `;
}

export const Confetti: ViewHook = {
  mounted() {
    // load instance of js-confetti if not already loaded
    if (!jsConfetti) {
      jsConfetti = new JSConfetti();
    }

    // map from data-confetti-* attributes to js-confetti options
    const confettiOptions: ConfettiOptions = Object.fromEntries(
      Array.from(this.el.attributes)
        .filter((attr) => attr.name.startsWith("data-confetti-"))
        .map((attr) => [attr.name.replace("data-confetti-", ""), attr.value])
    );

    // parse the attributes with zod
    const parsedConfettiOptions = confettiOptionsSchema.parse(confettiOptions);

    // listen for fireConfetti events from server
    this.handleEvent(ConfettiEvents.fireConfetti, () => {
      jsConfetti.addConfetti(parsedConfettiOptions);
    });
  },
};
