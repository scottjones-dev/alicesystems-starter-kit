import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** Rows and columns of data. */
const meta = {
  component: Table,
  tags: ["autodocs"],
  title: "ui/Table",
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { amount: "£120.00", id: "INV-1040", status: "Paid" },
  { amount: "£240.00", id: "INV-1041", status: "Due" },
  { amount: "£85.50", id: "INV-1042", status: "Paid" },
];

export const Default: Story = {
  render: () => (
    <Table className="w-96">
      <TableCaption>Recent invoices</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.id}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell className="text-right">{row.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
