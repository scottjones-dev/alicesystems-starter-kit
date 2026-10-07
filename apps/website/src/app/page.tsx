import { app } from "@repo/config/app";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <Badge className="w-fit" variant="secondary">
            Website
          </Badge>
          <CardTitle className="text-3xl">{app.name}</CardTitle>
          <CardDescription>{app.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            The public site. Pages and content arrive with the product.
          </p>
        </CardContent>
        <CardFooter>
          <Button>Get started</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
