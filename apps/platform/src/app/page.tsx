import { app } from "@repo/config/app";
import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <Badge className="w-fit" variant="secondary">
            Platform
          </Badge>
          <CardTitle className="text-3xl">{app.name} platform</CardTitle>
          <CardDescription>
            The signed-in app. Sign-in arrives with the auth package.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Everything behind a sign-in lives here.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
