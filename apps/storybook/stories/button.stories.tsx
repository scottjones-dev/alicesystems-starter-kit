import { Button } from "@repo/ui/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A button, or something that looks like one. */
const meta = {
  args: { children: "Button" },
  component: Button,
  tags: ["autodocs"],
  title: "ui/Button",
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The main action on a screen. Use one per view. */
export const Default: Story = {};

/** A lower-emphasis action next to a default one. */
export const Secondary: Story = { args: { variant: "secondary" } };

/** For actions like cancel or dismiss. */
export const Outline: Story = { args: { variant: "outline" } };

export const Ghost: Story = { args: { variant: "ghost" } };

/** For actions that delete or cannot be undone. */
export const Destructive: Story = { args: { variant: "destructive" } };

export const Link: Story = { args: { variant: "link" } };

export const Small: Story = { args: { size: "sm" } };

export const Large: Story = { args: { size: "lg" } };

export const Disabled: Story = { args: { disabled: true } };
