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
    path: "/form/register",
    tags: ["basic", "form", "modal"],
  },
  {
    title: "AI Chat",
    description: "A chat interface with AI",
    imageUrl: "/static/images/ai_chat_teaser.png",
    path: "/ai/chat",
    tags: ["basic", "form", "streaming"],
  },
  {
    title: "Photos",
    description: "A photo gallery with upload and favorite functionality",
    imageUrl: "/static/images/photos_teaser.png",
    path: "/photos",
    tags: ["intermediate", "upload", "drag-and-drop", "preview", "pubsub"],
  },
  {
    title: "S3 Photos",
    description: "A S3-backed photo gallery with upload and favorite functionality",
    imageUrl: "/static/images/s3_photos_teaser.png",
    path: "/photos/s3",
    tags: ["intermediate", "upload", "drag-and-drop", "preview", "s3", "pubsub"],
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
    title: "JS Commands",
    description: "JS Commands let you update the DOM without making a trip to the server.",
    imageUrl: "/static/images/jscommands_teaser.png",
    path: "/jscommands",
    tags: ["intermediate", "jscommands"],
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
