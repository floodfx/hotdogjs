export type Example = {
  title: string;
  description: string;
  imageUrl: string;
  path: string;
  tags: string[];
  category?: string;
  sourceLink?: string;
};

export const examples: Example[] = [
  {
    title: "Counter",
    description: "A simple counter view that increments and decrements a count based on button clicks.",
    imageUrl: "/static/images/counter_teaser.png",
    path: "/counter",
    tags: ["basic", "clicks"],
  },
  {
    title: "PubSub Counter",
    description: "Counter that synchronizes across multiple viewers.",
    imageUrl: "/static/images/pubsub_counter_teaser.png",
    path: "/pubsub/counter",
    tags: ["intermediate", "clicks", "pubsub"],
    category: "PubSub",
  },
  {
    title: "Countdown",
    description: "A countdown timer with server fired hotdog confetti",
    imageUrl: "/static/images/countdown_teaser.png",
    path: "/countdown",
    tags: ["basic", "timer", "server push"],
  },
  {
    title: "Toppings",
    description: "Choose toppings with keyboard navigation",
    imageUrl: "/static/images/toppings_teaser.png",
    path: "/toppings",
    tags: ["basic", "keyboard"],
  },
  {
    title: "Dashboard",
    description: "A dashboard that updates every second",
    imageUrl: "/static/images/dashboard_teaser.png",
    path: "/dashboard",
    tags: ["basic", "timer"],
  },
  {
    title: "Form",
    description: "A form with validation and success modal",
    imageUrl: "/static/images/form_validation_teaser.png",
    path: "/form",
    tags: ["basic", "form", "modal"],
  },
];

export const examplesByCategory = examples.reduce((acc, example) => {
  if (example.category) {
    acc[example.category] = [...(acc[example.category] || []), example];
  } else {
    acc[""] = [...(acc[""] || []), example];
  }
  return acc;
}, {} as Record<string, Example[]>);
