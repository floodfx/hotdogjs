import { BaseView, html, safe, type MountEvent, type ViewContext } from "hotdogjs";
import { Btn } from "src/components/button";
import { ConfettiEvents, configureConfetti } from "../../client/hooks/confetti";

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

type State = "running" | "paused" | "zero";

export default class Countdown extends BaseView<CountdownEvent> {
  start: number = 5;
  counter: number = 5;
  state: State = "paused";
  private timer?: ReturnType<typeof setInterval>;
  private stopFn: () => void;
  private startFn: (ctx: ViewContext<CountdownEvent>) => void;

  constructor() {
    super();
    this.stopFn = () => {
      this.timer && clearInterval(this.timer);
      this.timer = undefined;
      this.state = "paused";
    };
    this.startFn = (ctx: ViewContext<CountdownEvent>) => {
      this.timer = setInterval(() => {
        ctx.dispatchEvent({ type: "tick" });
      }, 1000);
      this.state = "running";
    };
  }

  mount(ctx: ViewContext<CountdownEvent>, e: MountEvent) {
    if (e.query.start) {
      this.start = Number(e.query.start);
      // limit to 99
      this.start = Math.min(this.start, 99);
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
    return html`<div class="flex flex-col justify-center items-center h-screen">
      <span
        class="countdown font-mono text-6xl"
        id="confetti"
        ${safe(
          configureConfetti({
            emojis: ["🌭"],
            emojiSize: 40,
            confettiNumber: 500,
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
