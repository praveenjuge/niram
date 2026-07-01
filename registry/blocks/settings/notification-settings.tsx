import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotificationSettingsBlock() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choose the updates that should reach your inbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p className="rounded-lg border p-3">Product updates: Weekly digest</p>
        <p className="rounded-lg border p-3">Security alerts: Immediately</p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button>Update preferences</Button>
      </CardFooter>
    </Card>
  );
}
