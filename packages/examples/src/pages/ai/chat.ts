import { form, ZodForm, type Form } from "@hotdogjs/form";
import type { IterableReadableStream } from "@langchain/core/utils/stream";
import { Ollama } from "@langchain/ollama";
import { BaseView, html, safe, type RenderMeta, type Template, type ViewContext } from "hotdogjs";
import { Converter } from "showdown";
import { z } from "zod";

type Model = "gemma:2b" | "deepseek-r1:14b";

const AIFormSchema = z.object({
  message: z.string(),
});

type AIForm = z.infer<typeof AIFormSchema>;

type AIChatEvent =
  | {
      type: "change-model";
      model: Model;
    }
  | {
      type: "send-message";
      message: string;
      files?: File[];
    }
  | {
      type: "start";
    }
  | {
      type: "streaming";
      nextChunk?: string;
    }
  | {
      type: "done";
    };

export default class AIChat extends BaseView<AIChatEvent> {
  model: Model = "gemma:2b";
  llm: Ollama = new Ollama({
    baseUrl: "http://localhost:11434",
    model: this.model,
  });
  form: Form<AIForm> = new ZodForm(AIFormSchema);
  stream: IterableReadableStream<string> | null = null;
  loading: boolean = false;
  mdConverter: Converter = new Converter({
    smoothLivePreview: true,
    openLinksInNewWindow: true,
    moreStyling: true,
  });
  chatMessages: { role: "user" | "assistant"; content: string }[] = [];

  async handleEvent(ctx: ViewContext<AIChatEvent>, event: AIChatEvent): Promise<void> {
    switch (event.type) {
      case "change-model":
        this.model = event.model;
        this.llm = new Ollama({
          baseUrl: "http://localhost:11434",
          model: this.model,
        });
        this.chatMessages = [];
        this.form.reset();
        break;
      case "send-message":
        this.form.update(event);
        if (this.form.valid) {
          ctx.dispatchEvent({ type: "start" });
          this.chatMessages.push({ role: "user", content: this.form.data.message! });
          this.loading = true;
        }
        break;
      case "start":
        this.stream = await this.llm.stream(this.chatMessages);
        this.chatMessages.push({ role: "assistant", content: "" });
        ctx.dispatchEvent({ type: "streaming" });
        break;
      case "streaming":
        if (event.nextChunk) {
          this.chatMessages[this.chatMessages.length - 1].content += event.nextChunk;
        }
        const nextChunk = await this.stream!.next();
        if (!nextChunk?.done) {
          ctx.dispatchEvent({ type: "streaming", nextChunk: nextChunk!.value });
        } else {
          ctx.dispatchEvent({ type: "done" });
        }
        break;
      case "done":
        this.loading = false;
        this.stream = null;
    }
  }

  render(meta: RenderMeta) {
    return html`
      <div class="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 class="text-2xl font-bold mb-4">AI Chat Bot</h2>
        <div class="w-full max-w-2xl bg-white rounded-lg shadow-md border border-gray-300 p-6">
          <div class="flex justify-between items-center gap-2 py-4">
            <h3 class="text-xl font-bold mb-4">What can I help you with?</h3>
            <form hd-change="change-model" hd-submit="save-model">
              <select name="model" class="select select-bordered">
                ${["gemma:2b", "deepseek-r1:14b"].map(
                  (m) => html`<option value="${m}" ${this.model === m ? "selected" : ""}>${m}</option>`
                )}
              </select>
            </form>
          </div>
          <div class="flex flex-col gap-2">
            ${this.chatMessages.map((m) => {
              if (m.role === "user") {
                return html`
                  <div class="chat chat-end">
                    <div class="chat-bubble">${m.content}</div>
                  </div>
                `;
              } else {
                return html`
                  <div class="flex flex-col gap-2">
                    <p class="prose w-full">${safe(this.mdConverter.makeHtml(m.content))}</p>
                  </div>
                `;
              }
            })}
          </div>
          ${form<AIChatEvent>(
            {
              onSubmit: "send-message",
              csrfToken: meta.csrfToken,
            },
            html`
              <div class="flex flex-col gap-2">
                <textarea
                  name="message"
                  class="textarea textarea-bordered w-full"
                  placeholder="Type your message here..."
                  rows="3"
                  required></textarea>
                <button ${this.loading ? safe("disabled") : ""} type="submit" class="btn btn-primary w-full">
                  ${this.loading ? html`<span class="loading loading-spinner loading-sm"></span>` : html`Go`}
                </button>
              </div>
            `
          )}
        </div>
      </div>
      ${addTailwindTypography()}
    `;
  }
}

/**
 * Tailwind Typography plugin enables sensible defaults for markdown rendering
 */
function addTailwindTypography(): Template {
  return html`<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/typography@0.5.16/src/index.min.js"></script>`;
}
