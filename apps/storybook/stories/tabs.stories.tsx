import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** Switch between related views without leaving the page. */
const meta = {
  component: Tabs,
  tags: ["autodocs"],
  title: "ui/Tabs",
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs className="w-80" defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Your account details.</TabsContent>
      <TabsContent value="billing">Your plan and invoices.</TabsContent>
    </Tabs>
  ),
};
