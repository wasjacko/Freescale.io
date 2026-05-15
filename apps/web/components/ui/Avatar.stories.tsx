import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar } from "./Avatar";

const meta: Meta<typeof Avatar> = {
  title: "UI / Avatar",
  component: Avatar,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const PhotoImage: Story = {
  args: {
    avatar: { kind: "img", src: "https://i.pravatar.cc/120?img=47", alt: "Sarah Johnson" },
  },
};

export const Initials: Story = {
  args: {
    avatar: { kind: "initials", text: "ACME", bg: "#0F172A" },
  },
};

export const InitialsGradient: Story = {
  args: {
    avatar: {
      kind: "initials",
      text: "MT",
      bg: "linear-gradient(135deg,#7C5BFF,#5865F2)",
    },
  },
};

export const LargeSize: Story = {
  args: {
    avatar: { kind: "img", src: "https://i.pravatar.cc/160?img=12", alt: "Mike Chen" },
    size: 64,
  },
};
