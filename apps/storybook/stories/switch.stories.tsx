import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A setting that takes effect straight away, on or off. */
const meta = {
  args: { "aria-label": "Notifications" },
  component: Switch,
  tags: ["autodocs"],
  title: "ui/Switch",
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const On: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="notifications" />
      <Label htmlFor="notifications">Email notifications</Label>
    </div>
  ),
};
