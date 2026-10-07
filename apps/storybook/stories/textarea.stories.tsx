import { Textarea } from "@repo/ui/components/textarea";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A multi-line text field. */
const meta = {
  args: { "aria-label": "Message", placeholder: "Write a message" },
  component: Textarea,
  tags: ["autodocs"],
  title: "ui/Textarea",
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

export const Invalid: Story = { args: { "aria-invalid": true } };
