import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function InviteAcceptanceBlock() {
  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>Join Northstar Studio</CardTitle>
        <CardDescription>Praveen invited you to collaborate.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input defaultValue="name@company.com" type="email" />
        <Input placeholder="Full name" />
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Decline</Button>
        <Button>Accept invite</Button>
      </CardFooter>
    </Card>
  );
}
