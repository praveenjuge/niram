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

export default function TeamSettingsBlock() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          Invite teammates with the right workspace context.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input placeholder="teammate@company.com" type="email" />
        <Input defaultValue="Member" />
      </CardContent>
      <CardFooter className="justify-end">
        <Button>Send invite</Button>
      </CardFooter>
    </Card>
  );
}
