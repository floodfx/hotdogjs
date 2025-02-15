import { BaseView, html, safe, type MountEvent, type ViewContext } from "hotdogjs";
import { Btn } from "src/components/button";
import { ConfettiEvents, configureConfetti } from "../../client/hooks/confetti";

/**
 * CountdownEvent represents the events that should be handled by the countdown view.
 */
type CountdownEvent =
  | {
      type: "tick";
    }
  | {
      type: "reset";
      value: number;
    }
  | {
      type: "start";
    }
  | {
      type: "stop";
    }
  | {
      type: "zero";
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
        if (this.counter === 0) {
          ctx.dispatchEvent({ type: "zero" });
          this.stopFn();
          return;
        }
        this.counter--;
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
    return html`<div class="flex flex-col justify-center items-center h-screen gap-4 max-w-sm mx-auto">
      <h2 class="text-2xl font-bold font-mono">Countdown</h2>
      <p class="text-sm">When the countdown reaches zero you'll get a special confetti.</p>
      <p class="text-sm">
        You can adjust the start value by updating the URL path. For example,
        <a class="link font-mono" href="/countdown/20">/countdown/20</a> will start the countdown at 20.
      </p>
      <p class="text-sm text-left">The longer the countdown the more confetti.</p>
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
      <div class="flex gap-4">
        ${new Btn<CountdownEvent>({
          label: "Start",
          onClick: "start",
          disabled: this.state !== "paused",
        })}
        ${new Btn<CountdownEvent>({
          label: "Stop",
          onClick: "stop",
          disabled: this.state !== "running",
        })}
        ${new Btn<CountdownEvent>({
          label: "Reset",
          onClick: "reset",
        })}
      </div>
    </div>`;
  }
}
