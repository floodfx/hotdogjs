import { BaseView, html, safe, type MountEvent, type ViewContext } from "hotdogjs";
import { Btn } from "src/components/button";
import { ConfettiEvents, configureConfetti } from "../../client/hooks/confetti";

/**
 * CountdownEvent represents the events that should be handled by the countdown view.
 */
type CountdownEvent =
  | {
      type: "tick";
      amount?: number;
    }
  | {
      type: "zero" | "start" | "stop";
    }
  | {
      type: "reset";
      value: number;
    };

/**
 * State represents the state of the countdown view.
 */
type State = "running" | "paused" | "zero";

/**
 * Countdown is a View that counts down from a start value to zero and then fires a confetti event.
 */
export default class Countdown extends BaseView<CountdownEvent> {
  start: number = 5;
  counter: number = 5;
  state: State = "paused";
  timer?: ReturnType<typeof setInterval> = undefined;
  stopFn: () => void = () => {
    this.timer && clearInterval(this.timer);
    this.timer = undefined;
    this.state = "paused";
  };
  startFn: (ctx: ViewContext<CountdownEvent>) => void = (ctx: ViewContext<CountdownEvent>) => {
    this.timer = setInterval(() => {
      ctx.dispatchEvent({ type: "tick" });
    }, 1000);
    this.state = "running";
  };

  mount(ctx: ViewContext<CountdownEvent>, e: MountEvent) {
    if (e.query.start) {
      this.start = Math.min(Math.abs(Number(e.query.start)), 99); // up to 99
      this.counter = this.start;
    }
    this.startFn(ctx);
  }

  handleEvent(ctx: ViewContext<CountdownEvent>, event: CountdownEvent): void | Promise<void> {
    switch (event.type) {
      case "tick":
        const decrement = event.amount ?? 1;
        this.counter = Math.max(this.counter - decrement, 0);
        if (this.counter === 0) {
          ctx.dispatchEvent({ type: "zero" });
          this.stopFn();
          return;
        }
        break;
      case "reset":
        this.stopFn();
        if (event.value) {
          this.counter = event.value;
        } else {
          this.counter = this.start;
        }
        break;
      case "start":
        this.startFn(ctx);
        break;
      case "stop":
        this.stopFn();
        break;
      case "zero":
        this.stopFn();
        this.state = "zero";
        ctx.pushEvent({ type: ConfettiEvents.fireConfetti });
        break;
    }
  }

  render() {
    return html`<div class="flex flex-col justify-start items-center h-screen gap-4 mx-auto">
      <div class="card bg-base-100 shadow-xl border border-gray-300">
        <div class="card-body">
          <h2 class="card-title">Countdown</h2>
          <p class="text-sm">
            When the countdown reaches zero you'll get a special confetti. The longer the countdown the more confetti.
          </p>
          <div class="flex mx-auto">
            <span
              class="countdown text-6xl font-mono"
              id="confetti"
              ${safe(
                configureConfetti({
                  emojis: ["🌭"],
                  emojiSize: 40,
                  confettiNumber: this.start * 5,
                })
              )}>
              <span style="--value:${this.counter};"></span>
            </span>
          </div>
          <div class="card-actions flex w-full justify-center pt-8">
            <div class="flex gap-4">
              ${new Btn<CountdownEvent>({
                label: "Start ▶️",
                onClick: "start",
                disabled: this.state !== "paused",
              })}
              ${new Btn<CountdownEvent>({
                label: "Stop ⏸️",
                onClick: "stop",
                disabled: this.state !== "running",
              })}
              ${new Btn<CountdownEvent>({
                label: "Reset ↩️",
                onClick: "reset",
              })}
              ${new Btn<CountdownEvent>({
                label: "Ten Ticks ⏩",
                onClick: "tick",
                disabled: this.state !== "running",
                clickParam: { key: "amount", value: 10 },
              })}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }
}
