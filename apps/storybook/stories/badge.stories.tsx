import { Badge } from "@repo/ui/components/badge";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A short label for a status or category. */
const meta = {
  args: { children: "Badge" },
  component: Badge,
  tags: ["autodocs"],
  title: "ui/Badge",
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };

export const Outline: Story = { args: { variant: "outline" } };

export const Destructive: Story = { args: { variant: "destructive" } };
