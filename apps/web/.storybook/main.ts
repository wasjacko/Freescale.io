import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(ts|tsx|mdx)"],
  addons: [],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: "react-docgen-typescript",
  },
  staticDirs: ["../public"],
};

export default config;
