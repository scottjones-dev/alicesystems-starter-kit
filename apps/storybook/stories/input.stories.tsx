import { Input } from "@repo/ui/components/input";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A single-line text field. Always pair it with a label. */
const meta = {
  args: { "aria-label": "Example", placeholder: "Type here" },
  component: Input,
  tags: ["autodocs"],
  title: "ui/Input",
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = { args: { defaultValue: "Ada Lovelace" } };

export const Password: Story = { args: { type: "password" } };

export const Disabled: Story = { args: { disabled: true } };

/** `aria-invalid` shows the error styling. Say what is wrong in text as well. */
export const Invalid: Story = { args: { "aria-invalid": true } };
