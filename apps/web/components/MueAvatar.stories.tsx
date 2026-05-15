import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MueAvatar } from "./MueAvatar";

const meta: Meta<typeof MueAvatar> = {
  title: "Mue / PixelAvatar",
  component: MueAvatar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof MueAvatar>;

export const Default: Story = {
  render: () => (
    <div style={{ width: 160, height: 160 }}>
      <MueAvatar />
    </div>
  ),
};

export const Tiny: Story = {
  render: () => (
    <div style={{ width: 32, height: 32 }}>
      <MueAvatar />
    </div>
  ),
};

export const WithGlow: Story = {
  render: () => (
    <div
      style={{
        width: 160,
        height: 160,
        display: "grid",
        placeItems: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -10,
          borderRadius: "50%",
          background:
            "radial-gradient(closest-side, rgba(139, 92, 246, 0.35), transparent 70%)",
          filter: "blur(14px)",
          zIndex: -1,
        }}
      />
      <MueAvatar />
    </div>
  ),
};
