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

export default function SignupTeamBlock() {
  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>
          Start with the essentials. Invite people later.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input placeholder="Workspace name" />
        <Input type="email" placeholder="you@company.com" />
        <Input type="password" placeholder="Create password" />
      </CardContent>
      <CardFooter>
        <Button className="w-full">Create workspace</Button>
      </CardFooter>
    </Card>
  );
}
