import type { Preview } from "@storybook/nextjs-vite";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "freescale-bg",
      values: [
        { name: "freescale-bg", value: "#F1F2F6" },
        { name: "white", value: "#ffffff" },
        { name: "ink", value: "#0F172A" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
