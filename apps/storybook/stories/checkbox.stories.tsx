import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A control that is on or off, for one option among several. */
const meta = {
  args: { "aria-label": "Accept" },
  component: Checkbox,
  tags: ["autodocs"],
  title: "ui/Checkbox",
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept the terms</Label>
    </div>
  ),
};
