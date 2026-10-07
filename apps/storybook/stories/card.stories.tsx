import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A container that groups related content and actions. */
const meta = {
  component: Card,
  tags: ["autodocs"],
  title: "ui/Card",
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Invoice 1042</CardTitle>
        <CardDescription>Due on 1 November</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Three line items, total £240.00.</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button>Pay now</Button>
        <Button variant="outline">Download</Button>
      </CardFooter>
    </Card>
  ),
};
