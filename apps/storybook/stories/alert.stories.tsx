import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A message that stays on the page until it is dealt with. */
const meta = {
  component: Alert,
  tags: ["autodocs"],
  title: "ui/Alert",
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert className="w-96">
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>
        Your trial ends in 3 days. Add a payment method to keep your data.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert className="w-96" variant="destructive">
      <AlertTitle>Payment failed</AlertTitle>
      <AlertDescription>
        We could not take your last payment. Update your card to avoid losing
        access.
      </AlertDescription>
    </Alert>
  ),
};
