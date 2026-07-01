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

export default function LoginWorkspaceBlock() {
  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in to Acme</CardTitle>
        <CardDescription>Use your work email to continue.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input type="email" placeholder="name@company.com" />
        <Input type="password" placeholder="Password" />
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="link" className="px-0">
          Reset password
        </Button>
        <Button>Sign in</Button>
      </CardFooter>
    </Card>
  );
}
