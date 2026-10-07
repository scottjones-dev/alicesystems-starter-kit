import { Label } from "@repo/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** Choose exactly one of a few options, all visible at once. */
const meta = {
  component: RadioGroup,
  tags: ["autodocs"],
  title: "ui/RadioGroup",
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup aria-label="Plan" defaultValue="monthly">
      <div className="flex items-center gap-2">
        <RadioGroupItem id="monthly" value="monthly" />
        <Label htmlFor="monthly">Monthly</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem id="yearly" value="yearly" />
        <Label htmlFor="yearly">Yearly</Label>
      </div>
    </RadioGroup>
  ),
};
