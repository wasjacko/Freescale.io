import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Icon, ChannelLogo } from "./Icon";
import { Sprite } from "./Sprite";

const meta: Meta = {
  title: "UI / Icons",
  decorators: [
    (Story) => (
      <>
        <Sprite />
        <Story />
      </>
    ),
  ],
};

export default meta;
type Story = StoryObj;

const ICONS = [
  "i-inbox", "i-task", "i-cal", "i-folder", "i-grid", "i-search", "i-filter",
  "i-edit", "i-more", "i-tag", "i-star", "i-clock", "i-heart", "i-spark",
  "i-list", "i-globe", "i-chevron", "i-chevron-down", "i-smile", "i-clip",
  "i-send", "i-info", "i-settings", "i-plus", "i-check", "i-lock",
  "i-arrow-up", "i-user", "i-heart-o", "i-cog",
];

export const AllIcons: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 16, padding: 24 }}>
      {ICONS.map((name) => (
        <div key={name} style={{ textAlign: "center", color: "#5B6475", fontSize: 11 }}>
          <Icon name={name} size={20} />
          <div style={{ marginTop: 8 }}>{name}</div>
        </div>
      ))}
    </div>
  ),
};

const CHANNELS = ["gmail", "instagram", "whatsapp", "slack", "discord", "x", "linkedin", "telegram", "messenger"];

export const AllChannels: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 16, padding: 24 }}>
      {CHANNELS.map((id) => (
        <div key={id} style={{ textAlign: "center", color: "#5B6475", fontSize: 11 }}>
          <div style={{ width: 32, height: 32, margin: "0 auto" }}>
            <ChannelLogo channel={id} className="channel-logo" />
          </div>
          <div style={{ marginTop: 8, textTransform: "capitalize" }}>{id}</div>
        </div>
      ))}
    </div>
  ),
};
